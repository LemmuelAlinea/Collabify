import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value))
  if (valid.length === 0) return 0
  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 100) / 100
}

function baseTaskWeight(task) {
  const explicitWeight = Number(task.score_weight ?? task.scoreWeight)
  if (explicitWeight > 0) return explicitWeight

  const priorityWeights = { low: 0.75, medium: 1, high: 1.35, urgent: 1.75 }
  const difficultyWeights = { easy: 2, medium: 4, hard: 7, critical: 10 }
  const difficulty = task.difficulty ?? 'medium'
  const hours = Number(task.estimated_hours) > 0 ? Number(task.estimated_hours) : (difficultyWeights[difficulty] ?? 4)
  const complexity = Number(task.complexity) > 0 ? Number(task.complexity) : 1
  return (difficultyWeights[difficulty] ?? 4) * hours * (priorityWeights[task.priority] ?? 1) * complexity
}

function keyBy(items, keyFn) {
  const map = new Map()
  for (const item of items) map.set(keyFn(item), item)
  return map
}

function groupBy(items, keyFn) {
  const map = new Map()
  for (const item of items) {
    const key = keyFn(item)
    const rows = map.get(key) ?? []
    rows.push(item)
    map.set(key, rows)
  }
  return map
}

function memberScoreKey(groupId, userId) {
  return `${groupId}:${userId}`
}

function normalizeGroupWeights(tasks) {
  const byGroup = groupBy(tasks, (task) => task.group_id)
  const weightsByTaskId = new Map()

  for (const groupTasks of byGroup.values()) {
    const totalWeight = groupTasks.reduce((sum, task) => sum + baseTaskWeight(task), 0) || 1
    let used = 0

    groupTasks.forEach((task, index) => {
      const value = index === groupTasks.length - 1
        ? Math.max(0, Math.round((100 - used) * 100) / 100)
        : Math.round((baseTaskWeight(task) / totalWeight) * 10000) / 100
      weightsByTaskId.set(task.id, value)
      used += value
    })
  }

  return weightsByTaskId
}

function ownerSharesForTask(task, assignmentsByTaskId, reassignmentByTaskId) {
  const reassignment = reassignmentByTaskId.get(task.id)
  if (reassignment) {
    if (reassignment.score_policy === 'full_transfer') {
      return reassignment.requested_assignee_id ? [[reassignment.requested_assignee_id, 1]] : []
    }
    if (reassignment.score_policy === 'split_50_50') {
      if (!reassignment.current_assignee_id || !reassignment.requested_assignee_id) return []
      return [
        [reassignment.current_assignee_id, 0.5],
        [reassignment.requested_assignee_id, 0.5],
      ]
    }
    if (reassignment.score_policy === 'keep_original') {
      return reassignment.current_assignee_id ? [[reassignment.current_assignee_id, 1]] : []
    }
  }

  const assignees = [...new Set((assignmentsByTaskId.get(task.id) ?? []).map((row) => row.assignee_id))]
  if (assignees.length === 0) return []
  const share = 1 / assignees.length
  return assignees.map((assigneeId) => [assigneeId, share])
}

async function getProfiles(userIds) {
  if (!userIds.length) return new Map()
  const { data } = await supabaseAdminClient
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', [...new Set(userIds)])
  return keyBy(data ?? [], (profile) => profile.user_id)
}

async function getScope(role, userId) {
  if (role === 'professor') {
    const { data: classes, error: classError } = await supabaseAdminClient
      .from('classes')
      .select('id')
      .eq('professor_id', userId)
      .eq('is_archived', false)
    if (classError) throw new HttpError(400, 'Unable to load classes', classError.message)

    const classIds = (classes ?? []).map((row) => row.id)
    if (!classIds.length) return { classIds: [], groupIds: [], projectIds: [] }

    const [{ data: groups, error: groupError }, { data: projects, error: projectError }] = await Promise.all([
      supabaseAdminClient.from('groups').select('id').in('class_id', classIds),
      supabaseAdminClient.from('projects').select('id').in('class_id', classIds),
    ])
    if (groupError) throw new HttpError(400, 'Unable to load groups', groupError.message)
    if (projectError) throw new HttpError(400, 'Unable to load projects', projectError.message)

    return {
      classIds,
      groupIds: (groups ?? []).map((row) => row.id),
      projectIds: (projects ?? []).map((row) => row.id),
    }
  }

  const { data: memberships, error } = await supabaseAdminClient
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('status', 'active')
  if (error) throw new HttpError(400, 'Unable to load your groups', error.message)
  const groupIds = (memberships ?? []).map((row) => row.group_id)
  if (!groupIds.length) return { classIds: [], groupIds: [], projectIds: [] }

  const { data: groups, error: groupError } = await supabaseAdminClient
    .from('groups')
    .select('id, class_id, project_id')
    .in('id', groupIds)
  if (groupError) throw new HttpError(400, 'Unable to load groups', groupError.message)

  return {
    classIds: [...new Set((groups ?? []).map((row) => row.class_id).filter(Boolean))],
    groupIds: (groups ?? []).map((row) => row.id),
    projectIds: [...new Set((groups ?? []).map((row) => row.project_id).filter(Boolean))],
  }
}

export async function getContributionDashboard(userId, role) {
  const scope = await getScope(role, userId)
  if (!scope.groupIds.length || !scope.projectIds.length) {
    return {
      summary: {
        averageMemberProgress: 0,
        totalEarnedPoints: 0,
        totalMembers: 0,
        totalPotentialPoints: 0,
        totalTasks: 0,
      },
      groups: [],
      members: [],
      tasks: [],
      events: [],
    }
  }

  const [{ data: groups, error: groupError }, { data: tasksRaw, error: taskError }] = await Promise.all([
    supabaseAdminClient
      .from('groups')
      .select('id, name, class_id, project_id, projects:project_id (title), classes:class_id (id, title, section)')
      .in('id', scope.groupIds),
    supabaseAdminClient
      .from('tasks')
      .select('id, title, group_id, project_id, status, parent_task_id, priority, estimated_hours, difficulty, complexity, archived_at')
      .in('group_id', scope.groupIds)
      .is('archived_at', null),
  ])
  if (groupError) throw new HttpError(400, 'Unable to load groups', groupError.message)
  if (taskError) throw new HttpError(400, 'Unable to load tasks', taskError.message)

  const parentIds = new Set((tasksRaw ?? []).map((task) => task.parent_task_id).filter(Boolean))
  const scoredTasks = (tasksRaw ?? []).filter((task) => !parentIds.has(task.id) && task.status !== 'cancelled')
  const taskIds = scoredTasks.map((task) => task.id)

  const [{ data: assignments, error: assignmentError }, { data: members, error: memberError }, { data: approvedReassignments, error: reassignmentError }, { data: logs, error: logsError }] = await Promise.all([
    taskIds.length
      ? supabaseAdminClient
        .from('task_assignments')
        .select('task_id, assignee_id')
        .in('task_id', taskIds)
      : { data: [] },
    supabaseAdminClient
      .from('group_members')
      .select('group_id, user_id, users:user_id (email)')
      .in('group_id', scope.groupIds)
      .eq('status', 'active'),
    taskIds.length
      ? supabaseAdminClient
        .from('reassignment_requests')
        .select('id, task_id, current_assignee_id, requested_assignee_id, score_policy, reviewed_at')
        .in('task_id', taskIds)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
      : { data: [] },
    supabaseAdminClient
      .from('contribution_logs')
      .select('id, user_id, group_id, project_id, task_id, contribution_type, description, logged_at')
      .in('group_id', scope.groupIds)
      .order('logged_at', { ascending: false })
      .limit(200),
  ])

  if (assignmentError) throw new HttpError(400, 'Unable to load task assignments', assignmentError.message)
  if (memberError) throw new HttpError(400, 'Unable to load group members', memberError.message)
  if (reassignmentError) throw new HttpError(400, 'Unable to load reassignments', reassignmentError.message)
  if (logsError) throw new HttpError(400, 'Unable to load contribution events', logsError.message)

  const profiles = await getProfiles([
    ...(members ?? []).map((member) => member.user_id),
    ...((logs ?? []).map((log) => log.user_id)),
  ])
  const groupById = keyBy(groups ?? [], (group) => group.id)
  const assignmentsByTaskId = groupBy(assignments ?? [], (row) => row.task_id)
  const reassignmentByTaskId = new Map()
  ;(approvedReassignments ?? []).forEach((row) => {
    if (!reassignmentByTaskId.has(row.task_id)) reassignmentByTaskId.set(row.task_id, row)
  })
  const taskWeights = normalizeGroupWeights(scoredTasks)

  const memberScores = new Map()
  const groupScores = new Map()
  const tasks = scoredTasks.map((task) => {
    const groupWeight = taskWeights.get(task.id) ?? 0
    const ownership = ownerSharesForTask(task, assignmentsByTaskId, reassignmentByTaskId)

    ownership.forEach(([ownerId, share]) => {
      const potential = groupWeight * share
      const earned = task.status === 'done' ? potential : 0
      const scoreKey = memberScoreKey(task.group_id, ownerId)
      const current = memberScores.get(scoreKey) ?? { earnedPoints: 0, potentialPoints: 0, assignedTasks: 0, completedTasks: 0 }
      memberScores.set(scoreKey, {
        earnedPoints: current.earnedPoints + earned,
        potentialPoints: current.potentialPoints + potential,
        assignedTasks: current.assignedTasks + 1,
        completedTasks: current.completedTasks + (task.status === 'done' ? 1 : 0),
      })
    })

    const groupCurrent = groupScores.get(task.group_id) ?? { earnedPoints: 0, potentialPoints: 0, completedTasks: 0, totalTasks: 0 }
    groupScores.set(task.group_id, {
      earnedPoints: groupCurrent.earnedPoints + (task.status === 'done' ? groupWeight : 0),
      potentialPoints: groupCurrent.potentialPoints + groupWeight,
      completedTasks: groupCurrent.completedTasks + (task.status === 'done' ? 1 : 0),
      totalTasks: groupCurrent.totalTasks + 1,
    })

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      groupId: task.group_id,
      groupName: groupById.get(task.group_id)?.name,
      projectId: task.project_id,
      projectTitle: groupById.get(task.group_id)?.projects?.title,
      groupWeight: Math.round(groupWeight * 100) / 100,
      owners: ownership.map(([userId, share]) => ({
        userId,
        displayName: profiles.get(userId)?.display_name ?? members?.find((member) => member.user_id === userId)?.users?.email,
        sharePercent: Math.round(share * 10000) / 100,
      })),
      pointsAwarded: task.status === 'done' && ownership.length > 0,
      scorePolicy: reassignmentByTaskId.get(task.id)?.score_policy ?? null,
    }
  })

  const membersList = (members ?? []).map((member) => {
    const score = memberScores.get(memberScoreKey(member.group_id, member.user_id)) ?? { earnedPoints: 0, potentialPoints: 0, assignedTasks: 0, completedTasks: 0 }
    const progressPercent = score.potentialPoints > 0 ? Math.round((score.earnedPoints / score.potentialPoints) * 100) : 0
    return {
      userId: member.user_id,
      groupId: member.group_id,
      groupName: groupById.get(member.group_id)?.name,
      displayName: profiles.get(member.user_id)?.display_name ?? member.users?.email,
      avatarUrl: profiles.get(member.user_id)?.avatar_url,
      earnedPoints: Math.round(score.earnedPoints * 100) / 100,
      potentialPoints: Math.round(score.potentialPoints * 100) / 100,
      progressPercent,
      assignedTasks: score.assignedTasks,
      completedTasks: score.completedTasks,
    }
  }).sort((a, b) => b.earnedPoints - a.earnedPoints)

  const groupsList = (groups ?? []).map((group) => {
    const score = groupScores.get(group.id) ?? { earnedPoints: 0, potentialPoints: 0, completedTasks: 0, totalTasks: 0 }
    const progressPercent = score.potentialPoints > 0 ? Math.round((score.earnedPoints / score.potentialPoints) * 100) : 0
    return {
      id: group.id,
      classId: group.class_id,
      className: group.classes?.title,
      name: group.name,
      section: group.classes?.section,
      projectTitle: group.projects?.title,
      earnedPoints: Math.round(score.earnedPoints * 100) / 100,
      potentialPoints: Math.round(score.potentialPoints * 100) / 100,
      progressPercent,
      completedTasks: score.completedTasks,
      totalTasks: score.totalTasks,
    }
  })

  const events = (logs ?? []).map((log) => ({
    id: log.id,
    userId: log.user_id,
    displayName: profiles.get(log.user_id)?.display_name,
    contributionType: log.contribution_type,
    description: log.description,
    loggedAt: log.logged_at,
    projectId: log.project_id,
    groupId: log.group_id,
    taskId: log.task_id,
    points: 0,
  }))

  const totalPotentialPoints = membersList.reduce((sum, member) => sum + member.potentialPoints, 0)
  const totalEarnedPoints = membersList.reduce((sum, member) => sum + member.earnedPoints, 0)

  return {
    summary: {
      averageMemberProgress: average(membersList.map((member) => member.progressPercent)),
      totalEarnedPoints: Math.round(totalEarnedPoints * 100) / 100,
      totalMembers: membersList.length,
      totalPotentialPoints: Math.round(totalPotentialPoints * 100) / 100,
      totalTasks: tasks.length,
    },
    groups: groupsList,
    members: role === 'student'
      ? membersList.filter((member) => member.userId === userId || scope.groupIds.includes(member.groupId))
      : membersList,
    tasks,
    events,
  }
}
