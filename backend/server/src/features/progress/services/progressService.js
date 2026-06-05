import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(value))
  if (validValues.length === 0) return 0
  return Math.round(validValues.reduce((sum, value) => sum + value, 0) / validValues.length)
}

function taskCompletion(tasks) {
  const total = tasks.length
  const completed = tasks.filter((task) => task.status === 'done').length
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

  return {
    blocked: tasks.filter((task) => task.status === 'blocked').length,
    completed,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    progress,
    total,
  }
}

function roundPoints(value) {
  return Math.round(Number(value ?? 0) * 100) / 100
}

function memberScoreKey(groupId, userId) {
  return `${groupId}:${userId}`
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

function normalizeGroupWeights(tasks) {
  const byGroup = groupBy(tasks, (task) => task.group_id)
  const weightsByTaskId = new Map()

  for (const groupTasks of byGroup.values()) {
    const totalWeight = groupTasks.reduce((sum, task) => sum + baseTaskWeight(task), 0) || 1
    let used = 0

    groupTasks.forEach((task, index) => {
      const value = index === groupTasks.length - 1
        ? Math.max(0, roundPoints(100 - used))
        : roundPoints((baseTaskWeight(task) / totalWeight) * 100)
      weightsByTaskId.set(task.id, value)
      used += value
    })
  }

  return weightsByTaskId
}

function ownerSharesForTask(task, assignmentsByTaskId, reassignmentByTaskId) {
  const reassignment = reassignmentByTaskId.get(task.id)
  if (reassignment?.score_policy === 'full_transfer') {
    return reassignment.requested_assignee_id ? [[reassignment.requested_assignee_id, 1]] : []
  }
  if (reassignment?.score_policy === 'split_50_50') {
    if (!reassignment.current_assignee_id || !reassignment.requested_assignee_id) return []
    return [
      [reassignment.current_assignee_id, 0.5],
      [reassignment.requested_assignee_id, 0.5],
    ]
  }
  if (reassignment?.score_policy === 'keep_original') {
    return reassignment.current_assignee_id ? [[reassignment.current_assignee_id, 1]] : []
  }

  const assignees = [...new Set((assignmentsByTaskId.get(task.id) ?? []).map((assignment) => assignment.assignee_id))]
  if (assignees.length === 0) return []
  const share = 1 / assignees.length
  return assignees.map((assigneeId) => [assigneeId, share])
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

function isMissingRelationError(error) {
  return ['42P01', '42703'].includes(error?.code)
}

function toTimestamp(value) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function earliestDate(values) {
  const timestamps = values.map(toTimestamp).filter(Number.isFinite)
  if (timestamps.length === 0) return null
  return new Date(Math.min(...timestamps)).toISOString()
}

function latestDate(values) {
  const timestamps = values.map(toTimestamp).filter(Number.isFinite)
  if (timestamps.length === 0) return null
  return new Date(Math.max(...timestamps)).toISOString()
}

function daysBetween(start, end) {
  const startTime = toTimestamp(start)
  const endTime = toTimestamp(end)
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0
  return Math.max(1, Math.ceil((endTime - startTime) / 86400000))
}

function filterWorkTasks(tasks = []) {
  const parentTaskIds = new Set(tasks.map((task) => task.parent_task_id).filter(Boolean))
  return tasks.filter((task) => {
    const taskType = task.metadata?.taskType ?? (task.parent_task_id ? 'child' : 'standalone')
    return taskType !== 'main' && !parentTaskIds.has(task.id)
  })
}

async function getProfiles(userIds) {
  if (userIds.length === 0) return new Map()

  const { data } = await supabaseAdminClient
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', [...new Set(userIds)])

  return new Map((data ?? []).map((profile) => [profile.user_id, profile]))
}

async function loadTimelineData({ classIds = [], groupIds = [] }) {
  if (classIds.length === 0 && groupIds.length === 0) {
    return {
      assignments: [],
      doneHistory: [],
      groups: [],
      members: [],
      profileByUserId: new Map(),
      tasks: [],
    }
  }

  const { data: groups, error: groupsError } = groupIds.length > 0
    ? await supabaseAdminClient
      .from('groups')
      .select('id, class_id, project_id, name, projects:project_id (id, title), classes:class_id (id, title, section)')
      .in('id', groupIds)
    : await supabaseAdminClient
      .from('groups')
      .select('id, class_id, project_id, name, projects:project_id (id, title), classes:class_id (id, title, section)')
      .in('class_id', classIds)

  if (groupsError) throw new HttpError(400, 'Unable to load timeline groups', groupsError.message)

  const resolvedGroupIds = (groups ?? []).map((group) => group.id)
  if (resolvedGroupIds.length === 0) {
    return {
      assignments: [],
      doneHistory: [],
      groups: groups ?? [],
      members: [],
      profileByUserId: new Map(),
      tasks: [],
    }
  }

  const [{ data: tasks, error: tasksError }, { data: members, error: membersError }] = await Promise.all([
    supabaseAdminClient
      .from('tasks')
      .select('id, project_id, group_id, parent_task_id, title, description, status, progress, due_at, completed_at, created_at, archived_at, metadata, groups:group_id (name), projects:project_id (id, title)')
      .in('group_id', resolvedGroupIds)
      .is('archived_at', null),
    supabaseAdminClient
      .from('group_members')
      .select('group_id, user_id, is_leader, users:user_id (email)')
      .in('group_id', resolvedGroupIds)
      .eq('status', 'active'),
  ])

  if (tasksError) throw new HttpError(400, 'Unable to load timeline tasks', tasksError.message)
  if (membersError) throw new HttpError(400, 'Unable to load timeline members', membersError.message)

  const taskIds = (tasks ?? []).map((task) => task.id)
  const { data: assignments, error: assignmentsError } = taskIds.length > 0
    ? await supabaseAdminClient
      .from('task_assignments')
      .select('task_id, assignee_id, assigned_at, users:assignee_id (email)')
      .in('task_id', taskIds)
    : { data: [] }

  if (assignmentsError) throw new HttpError(400, 'Unable to load timeline assignments', assignmentsError.message)

  let doneHistory = []
  if (taskIds.length > 0) {
    const { data: history, error: historyError } = await supabaseAdminClient
      .from('task_status_history')
      .select('task_id, old_status, new_status, created_at')
      .in('task_id', taskIds)
      .order('created_at', { ascending: true })

    if (historyError && !isMissingRelationError(historyError)) {
      throw new HttpError(400, 'Unable to load timeline history', historyError.message)
    }

    doneHistory = historyError ? [] : (history ?? [])
  }

  const profileByUserId = await getProfiles([
    ...(members ?? []).map((member) => member.user_id),
    ...(assignments ?? []).map((assignment) => assignment.assignee_id),
  ])

  return {
    assignments: assignments ?? [],
    doneHistory,
    groups: groups ?? [],
    members: members ?? [],
    profileByUserId,
    tasks: tasks ?? [],
  }
}

function buildTimeline(data, scope) {
  const today = new Date().toISOString()
  const assignmentsByTaskId = groupBy(data.assignments, (assignment) => assignment.task_id)
  const membersByGroupId = groupBy(data.members, (member) => member.group_id)
  const timelineTasks = filterWorkTasks(data.tasks)
  const tasksByGroupId = groupBy(timelineTasks, (task) => task.group_id)
  const historyByTaskId = groupBy(data.doneHistory, (history) => history.task_id)

  const firstStatusDate = (histories, status) => histories.find((history) => history.new_status === status)?.created_at ?? null
  const lastStatusDate = (histories, status) => [...histories].reverse().find((history) => history.new_status === status)?.created_at ?? null

  const groups = data.groups.map((group) => {
    const groupTasks = tasksByGroupId.get(group.id) ?? []
    const tasks = groupTasks.map((task) => {
      const assignments = assignmentsByTaskId.get(task.id) ?? []
      const histories = historyByTaskId.get(task.id) ?? []
      const rawStatus = task.status === 'in_review' ? 'review' : task.status
      const normalizedStatus = rawStatus === 'blocked' || rawStatus === 'cancelled' ? 'todo' : rawStatus
      const assignedAt = earliestDate(assignments.map((assignment) => assignment.assigned_at))
      const inProgressAt = firstStatusDate(histories, 'in_progress')
      const reviewAt = firstStatusDate(histories, 'review') ?? firstStatusDate(histories, 'in_review')
      const completedAt = task.completed_at ?? lastStatusDate(histories, 'done') ?? null
      const startAt = inProgressAt ?? reviewAt ?? assignedAt ?? task.created_at ?? today
      const endCandidates = [
        task.due_at,
        normalizedStatus === 'done' ? completedAt : null,
        normalizedStatus !== 'done' && !task.due_at ? today : null,
      ].filter(Boolean)
      const endAt = latestDate(endCandidates) ?? today
      const assignees = assignments.map((assignment) => ({
        displayName: data.profileByUserId.get(assignment.assignee_id)?.display_name ?? assignment.users?.email ?? 'Member',
        assignedAt: assignment.assigned_at,
        userId: assignment.assignee_id,
      }))

      return {
        assigneeLabel: assignees.length > 0 ? assignees.map((assignee) => assignee.displayName).join(', ') : 'Unassigned',
        assignees,
        completedAt,
        createdAt: task.created_at,
        description: task.description,
        dueAt: task.due_at,
        durationDays: daysBetween(startAt, endAt),
        endAt,
        groupId: task.group_id,
        groupName: task.groups?.name ?? group.name,
        id: task.id,
        isOverdue: task.status !== 'done' && task.due_at && toTimestamp(task.due_at) < toTimestamp(today),
        progress: task.progress ?? (task.status === 'done' ? 100 : 0),
        projectId: task.project_id,
        projectTitle: task.projects?.title ?? group.projects?.title,
        startAt,
        status: normalizedStatus,
        title: task.title,
      }
    })

    const members = (membersByGroupId.get(group.id) ?? []).map((member) => ({
      displayName: data.profileByUserId.get(member.user_id)?.display_name ?? member.users?.email ?? 'Member',
      role: member.is_leader ? 'Leader' : 'Member',
      userId: member.user_id,
    }))

    return {
      classId: group.class_id,
      className: group.classes?.title,
      id: group.id,
      memberCount: members.length,
      members,
      name: group.name,
      projectId: group.project_id,
      projectTitle: group.projects?.title,
      section: group.classes?.section,
      tasks,
    }
  })

  const allTasks = groups.flatMap((group) => group.tasks)
  const rangeStart = earliestDate(allTasks.map((task) => task.startAt)) ?? today
  const rangeEnd = latestDate([
    ...allTasks.map((task) => task.endAt),
    ...allTasks.map((task) => task.dueAt),
    today,
  ]) ?? today

  return {
    generatedAt: today,
    groups,
    rangeEnd,
    rangeStart,
    scope,
  }
}

function buildTaskPointScores(tasks, assignments, approvedReassignments) {
  const assignmentsByTaskId = groupBy(assignments, (assignment) => assignment.task_id)
  const reassignmentByTaskId = new Map()
  ;(approvedReassignments ?? []).forEach((row) => {
    if (!reassignmentByTaskId.has(row.task_id)) reassignmentByTaskId.set(row.task_id, row)
  })

  const weightsByTaskId = normalizeGroupWeights(tasks.filter((task) => task.status !== 'cancelled'))
  const memberScores = new Map()
  const groupPoints = new Map()
  const projectPoints = new Map()
  const taskPoints = new Map()

  for (const task of tasks) {
    if (task.status === 'cancelled') continue
    const taskWeight = weightsByTaskId.get(task.id) ?? 0
    taskPoints.set(task.id, taskWeight)
    const owners = ownerSharesForTask(task, assignmentsByTaskId, reassignmentByTaskId)

    for (const [userId, share] of owners) {
      const key = memberScoreKey(task.group_id, userId)
      const current = memberScores.get(key) ?? { completedTasks: 0, contributionPoints: 0, progressTasks: [], totalTasks: 0 }
      const earned = task.status === 'done' ? taskWeight * share : 0

      memberScores.set(key, {
        completedTasks: current.completedTasks + (task.status === 'done' ? 1 : 0),
        contributionPoints: current.contributionPoints + earned,
        progressTasks: [...current.progressTasks, task],
        totalTasks: current.totalTasks + 1,
      })

      if (task.status === 'done') {
        groupPoints.set(task.group_id, (groupPoints.get(task.group_id) ?? 0) + earned)
        projectPoints.set(task.project_id, (projectPoints.get(task.project_id) ?? 0) + earned)
      }
    }
  }

  return { groupPoints, memberScores, projectPoints, taskPoints }
}

function buildMemberProgress({ members, memberScores, profileByUserId }) {
  return members.map((member) => {
    const score = memberScores.get(memberScoreKey(member.group_id, member.user_id)) ?? {
      completedTasks: 0,
      contributionPoints: 0,
      progressTasks: [],
      totalTasks: 0,
    }
    const profile = profileByUserId.get(member.user_id)

    return {
      avatarUrl: profile?.avatar_url,
      completedTasks: score.completedTasks,
      contributionPoints: roundPoints(score.contributionPoints),
      displayName: profile?.display_name ?? member.users?.email,
      email: member.users?.email,
      progress: average(score.progressTasks.map((task) => task.progress ?? (task.status === 'done' ? 100 : 0))),
      totalTasks: score.totalTasks,
      userId: member.user_id,
    }
  })
}

function buildTaskRows(tasks, assignmentsByTaskId, profileByUserId, taskPointsById = new Map()) {
  return tasks.map((task) => ({
    assignees: (assignmentsByTaskId.get(task.id) ?? []).map((assignment) => ({
      displayName: profileByUserId.get(assignment.assignee_id)?.display_name ?? assignment.users?.email,
      userId: assignment.assignee_id,
    })),
    groupId: task.group_id,
    groupName: task.groups?.name,
    id: task.id,
    progress: task.progress ?? (task.status === 'done' ? 100 : 0),
    points: roundPoints(taskPointsById.get(task.id) ?? 0),
    projectId: task.project_id,
    projectTitle: task.projects?.title,
    status: task.status,
    title: task.title,
  }))
}

async function loadProgressData({ classIds = [], groupIds = [], projectIds = [] }) {
  if (classIds.length === 0 && groupIds.length === 0 && projectIds.length === 0) {
    return {
      assignments: [],
      approvedReassignments: [],
      groups: [],
      members: [],
      profileByUserId: new Map(),
      projects: [],
      tasks: [],
    }
  }

  const { data: groups, error: groupsError } = groupIds.length > 0
    ? await supabaseAdminClient
      .from('groups')
      .select('id, class_id, project_id, name, projects:project_id (id, title), classes:class_id (id, title, section)')
      .in('id', groupIds)
    : await supabaseAdminClient
      .from('groups')
      .select('id, class_id, project_id, name, projects:project_id (id, title), classes:class_id (id, title, section)')
      .in('class_id', classIds)

  if (groupsError) throw new HttpError(400, 'Unable to load groups', groupsError.message)

  const resolvedGroupIds = (groups ?? []).map((group) => group.id)
  const groupProjectIds = (groups ?? []).map((group) => group.project_id).filter(Boolean)
  const requestedProjectIds = projectIds.length > 0 ? projectIds : []
  const resolvedProjectIds = [...new Set([...requestedProjectIds, ...groupProjectIds])]

  const { data: projects, error: projectsError } = resolvedProjectIds.length > 0
    ? await supabaseAdminClient
      .from('projects')
      .select('id, class_id, title, status')
      .in('id', resolvedProjectIds)
    : await supabaseAdminClient
      .from('projects')
      .select('id, class_id, title, status')
      .in('class_id', classIds)

  if (projectsError) throw new HttpError(400, 'Unable to load projects', projectsError.message)

  const [{ data: tasks, error: tasksError }, { data: members, error: membersError }] = await Promise.all([
    resolvedGroupIds.length > 0
      ? supabaseAdminClient
        .from('tasks')
        .select('id, project_id, group_id, parent_task_id, title, status, progress, priority, estimated_hours, score_weight, difficulty, complexity, archived_at, metadata, groups:group_id (name), projects:project_id (title)')
        .in('group_id', resolvedGroupIds)
        .is('archived_at', null)
      : { data: [] },
    resolvedGroupIds.length > 0
      ? supabaseAdminClient
        .from('group_members')
        .select('group_id, user_id, users:user_id (email)')
        .in('group_id', resolvedGroupIds)
        .eq('status', 'active')
      : { data: [] },
  ])

  if (tasksError) throw new HttpError(400, 'Unable to load tasks', tasksError.message)
  if (membersError) throw new HttpError(400, 'Unable to load members', membersError.message)

  const workTasks = filterWorkTasks(tasks ?? [])
  const taskIds = workTasks.map((task) => task.id)
  const { data: assignments, error: assignmentsError } = taskIds.length > 0
    ? await supabaseAdminClient
      .from('task_assignments')
      .select('task_id, assignee_id, users:assignee_id (email)')
      .in('task_id', taskIds)
    : { data: [] }

  if (assignmentsError) throw new HttpError(400, 'Unable to load task assignments', assignmentsError.message)

  const { data: approvedReassignments, error: reassignmentsError } = taskIds.length > 0
    ? await supabaseAdminClient
      .from('reassignment_requests')
      .select('id, task_id, current_assignee_id, requested_assignee_id, score_policy, reviewed_at')
      .in('task_id', taskIds)
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
    : { data: [] }

  if (reassignmentsError) throw new HttpError(400, 'Unable to load task reassignments', reassignmentsError.message)

  const profileByUserId = await getProfiles([
    ...(members ?? []).map((member) => member.user_id),
    ...(assignments ?? []).map((assignment) => assignment.assignee_id),
    ...(approvedReassignments ?? []).flatMap((row) => [row.current_assignee_id, row.requested_assignee_id]).filter(Boolean),
  ])

  return {
    assignments: assignments ?? [],
    approvedReassignments: approvedReassignments ?? [],
    groups: groups ?? [],
    members: members ?? [],
    profileByUserId,
    projects: projects ?? [],
    tasks: workTasks,
  }
}

function buildDashboard(data, scope) {
  const tasksByProject = groupBy(data.tasks, (task) => task.project_id)
  const tasksByGroup = groupBy(data.tasks, (task) => task.group_id)
  const membersByGroup = groupBy(data.members, (member) => member.group_id)
  const assignmentsByTaskId = groupBy(data.assignments, (assignment) => assignment.task_id)
  const pointScores = buildTaskPointScores(data.tasks, data.assignments, data.approvedReassignments)

  const projects = data.projects.map((project) => {
    const tasks = tasksByProject.get(project.id) ?? []
    const completion = taskCompletion(tasks)
    return {
      classId: project.class_id,
      contributionPoints: roundPoints(pointScores.projectPoints.get(project.id) ?? 0),
      id: project.id,
      progress: average(tasks.map((task) => task.progress ?? (task.status === 'done' ? 100 : 0))),
      status: project.status,
      taskCompletion: completion,
      title: project.title,
    }
  })

  const groups = data.groups.map((group) => {
    const tasks = tasksByGroup.get(group.id) ?? []
    const members = membersByGroup.get(group.id) ?? []

    return {
      classId: group.class_id,
      className: group.classes?.title,
      section: group.classes?.section,
      contributionPoints: roundPoints(pointScores.groupPoints.get(group.id) ?? 0),
      id: group.id,
      memberCount: members.length,
      members: buildMemberProgress({
        members,
        memberScores: pointScores.memberScores,
        profileByUserId: data.profileByUserId,
      }),
      name: group.name,
      progress: average(tasks.map((task) => task.progress ?? (task.status === 'done' ? 100 : 0))),
      projectId: group.project_id,
      projectTitle: group.projects?.title,
      taskCompletion: taskCompletion(tasks),
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    groups,
    overview: {
      averageGroupProgress: average(groups.map((group) => group.progress)),
      averageProjectProgress: average(projects.map((project) => project.progress)),
      contributionPoints: roundPoints(groups.reduce((sum, group) => sum + Number(group.contributionPoints ?? 0), 0)),
      groups: groups.length,
      projects: projects.length,
      taskCompletion: taskCompletion(data.tasks),
    },
    projects,
    scope,
    tasks: buildTaskRows(data.tasks, assignmentsByTaskId, data.profileByUserId, pointScores.taskPoints),
  }
}

export async function getProgressDashboard(userId, role) {
  if (role === 'professor') {
    const { data: classes, error } = await supabaseAdminClient
      .from('classes')
      .select('id, title, section')
      .eq('professor_id', userId)
      .eq('is_archived', false)

    if (error) throw new HttpError(400, 'Unable to load classes', error.message)
    const data = await loadProgressData({ classIds: (classes ?? []).map((classItem) => classItem.id) })

    return {
      ...buildDashboard(data, { classes: classes ?? [], role }),
      personal: null,
    }
  }

  const { data: memberships, error } = await supabaseAdminClient
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) throw new HttpError(400, 'Unable to load your groups', error.message)
  const groupIds = (memberships ?? []).map((membership) => membership.group_id)
  const data = await loadProgressData({ groupIds })
  const pointScores = buildTaskPointScores(data.tasks, data.assignments, data.approvedReassignments)
  const assignedTasks = data.assignments
    .filter((assignment) => assignment.assignee_id === userId)
    .map((assignment) => data.tasks.find((task) => task.id === assignment.task_id))
    .filter(Boolean)
  const personalContributionPoints = [...pointScores.memberScores.entries()]
    .filter(([key]) => key.endsWith(`:${userId}`))
    .reduce((sum, [, score]) => sum + Number(score.contributionPoints ?? 0), 0)

  return {
    ...buildDashboard(data, { role }),
    personal: {
      contributionPoints: roundPoints(personalContributionPoints),
      progress: average(assignedTasks.map((task) => task.progress ?? (task.status === 'done' ? 100 : 0))),
      taskCompletion: taskCompletion(assignedTasks),
    },
  }
}

export async function getProgressTimeline(userId, role) {
  if (role === 'professor') {
    const { data: classes, error } = await supabaseAdminClient
      .from('classes')
      .select('id, title, section')
      .eq('professor_id', userId)
      .eq('is_archived', false)

    if (error) throw new HttpError(400, 'Unable to load classes', error.message)

    const data = await loadTimelineData({ classIds: (classes ?? []).map((classItem) => classItem.id) })
    return buildTimeline(data, { classes: classes ?? [], role })
  }

  const { data: memberships, error } = await supabaseAdminClient
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) throw new HttpError(400, 'Unable to load your groups', error.message)

  const data = await loadTimelineData({ groupIds: (memberships ?? []).map((membership) => membership.group_id) })
  return buildTimeline(data, { role })
}
