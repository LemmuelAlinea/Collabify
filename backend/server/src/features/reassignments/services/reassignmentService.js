import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'
import { loadStudentPerformance } from '../../groups/services/groupService.js'
import { groupByRows, normalizeGroupWeights, ownerSharesForTask } from '../../tasks/services/taskService.js'
import { generateReassignmentAnalysisAiInsight } from './reassignmentAnalysisAiService.js'

const EMERGENCY_REASON_KEYWORDS = [
  'sick', 'illness', 'ill', 'hospital', 'hospitalized', 'emergency', 'accident',
  'medical', 'surgery', 'health', 'bereavement', 'death', 'injury', 'injured',
]

const PERFORMANCE_REASON_KEYWORDS = [
  'not participating', 'unresponsive', 'inactive', 'not contributing', 'missing',
  'ghosting', 'ghosted', 'absent', 'ignoring', 'not doing', 'no response',
  'not responding', 'not communicating', 'disengaged', 'unreliable',
]

function classifyReason(reason) {
  const text = (reason ?? '').toLowerCase()
  const emergencyMatches = EMERGENCY_REASON_KEYWORDS.filter((keyword) => text.includes(keyword))
  if (emergencyMatches.length) return { category: 'emergency', matchedKeywords: emergencyMatches }

  const performanceMatches = PERFORMANCE_REASON_KEYWORDS.filter((keyword) => text.includes(keyword))
  if (performanceMatches.length) return { category: 'performance', matchedKeywords: performanceMatches }

  return { category: 'unclear', matchedKeywords: [] }
}

function buildHeuristicVerdict({ activity, currentAssigneeWorkload, reasonCategory }) {
  if (reasonCategory === 'emergency') {
    if (activity.status !== 'active') {
      return {
        suggestion: `The stated reason points to an emergency or health issue, and the current assignee's recent activity (${activity.status.replace('_', ' ')}) is consistent with that. This request looks valid.`,
        verdict: 'valid',
      }
    }
    return {
      suggestion: 'The stated reason points to an emergency or health issue. Recent activity still looks normal, but emergencies can be sudden, so this request looks plausible.',
      verdict: 'valid',
    }
  }

  if (reasonCategory === 'performance') {
    if (activity.status !== 'active') {
      return {
        suggestion: `The performance concern is supported by the data - the current assignee's activity is ${activity.status.replace('_', ' ')} compared to the rest of the group. This request looks valid, though it reflects negatively on the current assignee.`,
        verdict: 'valid_negative',
      }
    }
    return {
      suggestion: "The stated performance concern doesn't match the data - the current assignee's activity and contribution look normal compared to the group. Consider discussing with both students before deciding.",
      verdict: 'questionable',
    }
  }

  if (currentAssigneeWorkload.status === 'over') {
    return {
      suggestion: 'The current assignee is carrying more than their fair share of the group workload, which supports reassigning this task even though the stated reason is unclear.',
      verdict: 'valid',
    }
  }

  return {
    suggestion: "The stated reason isn't clearly an emergency or a performance concern, and the workload/activity data doesn't strongly support or contradict the request. Consider asking for more details before deciding.",
    verdict: 'needs_info',
  }
}

async function analyzeGroupWorkload(groupId) {
  const [{ data: members, error: memberError }, { data: tasks, error: taskError }] = await Promise.all([
    supabaseAdminClient
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('status', 'active'),
    supabaseAdminClient
      .from('tasks')
      .select('id, parent_task_id, status, priority, estimated_hours, difficulty, complexity, archived_at')
      .eq('group_id', groupId)
      .is('archived_at', null),
  ])

  if (memberError) throw new HttpError(400, 'Unable to load group members', memberError.message)
  if (taskError) throw new HttpError(400, 'Unable to load group tasks', taskError.message)

  const memberIds = (members ?? []).map((member) => member.user_id)
  const parentIds = new Set((tasks ?? []).map((task) => task.parent_task_id).filter(Boolean))
  const scoredTasks = (tasks ?? []).filter((task) => !parentIds.has(task.id) && task.status !== 'cancelled')
  const taskIds = scoredTasks.map((task) => task.id)

  const [{ data: assignments, error: assignmentError }, { data: approvedReassignments, error: reassignmentError }] = await Promise.all([
    taskIds.length
      ? supabaseAdminClient.from('task_assignments').select('task_id, assignee_id').in('task_id', taskIds)
      : { data: [] },
    taskIds.length
      ? supabaseAdminClient
        .from('reassignment_requests')
        .select('task_id, current_assignee_id, requested_assignee_id, score_policy, reviewed_at')
        .in('task_id', taskIds)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
      : { data: [] },
  ])

  if (assignmentError) throw new HttpError(400, 'Unable to load task assignments', assignmentError.message)
  if (reassignmentError) throw new HttpError(400, 'Unable to load reassignment scores', reassignmentError.message)

  const weightsByTaskId = normalizeGroupWeights(scoredTasks)
  const assignmentsByTaskId = groupByRows(assignments, 'task_id')
  const reassignmentByTaskId = new Map()
  ;(approvedReassignments ?? []).forEach((row) => {
    if (!reassignmentByTaskId.has(row.task_id)) reassignmentByTaskId.set(row.task_id, row)
  })

  const memberScores = new Map(memberIds.map((id) => [id, 0]))
  for (const task of scoredTasks) {
    const taskPoints = weightsByTaskId.get(task.id) ?? 0
    ownerSharesForTask(task, assignmentsByTaskId, reassignmentByTaskId).forEach(([ownerId, share]) => {
      memberScores.set(ownerId, (memberScores.get(ownerId) ?? 0) + (taskPoints * share))
    })
  }

  const groupCapacity = Math.max(1, memberIds.length)
  const targetShare = Math.round((100 / groupCapacity) * 100) / 100
  const allowedOverage = Math.max(5, targetShare * 0.15)

  return { allowedOverage, memberIds, memberScores, targetShare }
}

async function analyzeAssigneeActivity(currentAssigneeId, memberIds) {
  const performanceIds = memberIds.includes(currentAssigneeId) ? memberIds : [...memberIds, currentAssigneeId]
  const performanceByUser = await loadStudentPerformance(performanceIds)

  const { data: lastLog, error: logError } = await supabaseAdminClient
    .from('contribution_logs')
    .select('logged_at')
    .eq('user_id', currentAssigneeId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (logError) throw new HttpError(400, 'Unable to load activity logs', logError.message)

  const assigneePerformance = performanceByUser.get(currentAssigneeId) ?? { points: 0, score: 0, taskCompletion: 0 }
  const scores = [...performanceByUser.values()].map((entry) => entry.score)
  const groupAverageScore = scores.length
    ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100) / 100
    : 0

  const daysSinceLastActivity = lastLog?.logged_at
    ? Math.floor((Date.now() - new Date(lastLog.logged_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  let status = 'active'
  if (daysSinceLastActivity === null || daysSinceLastActivity > 14 || assigneePerformance.score === 0) {
    status = 'inactive'
  } else if (daysSinceLastActivity > 7 || assigneePerformance.score < groupAverageScore * 0.6) {
    status = 'low_activity'
  }

  return {
    daysSinceLastActivity,
    groupAverageScore,
    points: assigneePerformance.points,
    score: assigneePerformance.score,
    status,
    taskCompletion: assigneePerformance.taskCompletion,
  }
}

const REQUEST_SELECT = `
  id,
  class_id,
  project_id,
  task_id,
  requested_by,
  current_assignee_id,
  requested_assignee_id,
  current_group_id,
  requested_group_id,
  reason,
  score_policy,
  status,
  reviewed_by,
  reviewed_at,
  review_notes,
  archived_at,
  archived_by,
  created_at,
  updated_at,
  tasks:task_id (id, title, group_id, project_id),
  projects:project_id (id, title),
  classes:class_id (id, title, section, professor_id)
`

function normalizeRequest(row, profileByUserId = new Map()) {
  return {
    id: row.id,
    classId: row.class_id,
    projectId: row.project_id,
    taskId: row.task_id,
    requestedBy: row.requested_by,
    currentAssigneeId: row.current_assignee_id,
    requestedAssigneeId: row.requested_assignee_id,
    currentGroupId: row.current_group_id,
    requestedGroupId: row.requested_group_id,
    reason: row.reason,
    scorePolicy: row.score_policy,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    archivedAt: row.archived_at,
    archivedBy: row.archived_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    task: row.tasks ? { id: row.tasks.id, title: row.tasks.title } : null,
    project: row.projects ? { id: row.projects.id, title: row.projects.title } : null,
    class: row.classes ? { id: row.classes.id, title: row.classes.title, section: row.classes.section } : null,
    requestedByName: profileByUserId.get(row.requested_by)?.display_name,
    currentAssigneeName: profileByUserId.get(row.current_assignee_id)?.display_name,
    requestedAssigneeName: profileByUserId.get(row.requested_assignee_id)?.display_name,
  }
}

async function getProfiles(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return new Map()

  const { data } = await supabaseAdminClient
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', ids)

  return new Map((data ?? []).map((profile) => [profile.user_id, profile]))
}

async function normalizeRows(rows) {
  const profileByUserId = await getProfiles(rows.flatMap((row) => [
    row.requested_by,
    row.current_assignee_id,
    row.requested_assignee_id,
  ]))
  return rows.map((row) => normalizeRequest(row, profileByUserId))
}

async function getTaskContext(taskId) {
  const { data, error } = await supabaseAdminClient
    .from('tasks')
    .select(`
      id,
      title,
      project_id,
      group_id,
      groups:group_id (
        id,
        class_id,
        classes:class_id (professor_id)
      )
    `)
    .eq('id', taskId)
    .single()

  if (error || !data) throw new HttpError(404, 'Task not found')
  return data
}

async function assertGroupMember(groupId, userId) {
  const { data, error } = await supabaseAdminClient
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) throw new HttpError(422, 'Assignee must be an active group member')
}

async function assertCanRequest(userId, role, task) {
  if (role === 'professor') {
    await assertProfessorOwnsClass(task.groups.class_id, userId)
    return
  }

  await assertGroupMember(task.group_id, userId)
}

async function getRequest(id) {
  const { data, error } = await supabaseAdminClient
    .from('reassignment_requests')
    .select(REQUEST_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) throw new HttpError(404, 'Reassignment request not found')
  return data
}

async function applyScorePolicy({ currentAssigneeId, requestedAssigneeId, requestId, scorePolicy, taskId }) {
  if (scorePolicy === 'keep_original') return

  const { data: logs, error } = await supabaseAdminClient
    .from('contribution_logs')
    .select('*')
    .eq('task_id', taskId)
    .eq('user_id', currentAssigneeId)

  if (error) throw new HttpError(400, 'Unable to load contribution scores', error.message)
  if (!logs?.length) return

  if (scorePolicy === 'full_transfer') {
    const { error: transferError } = await supabaseAdminClient
      .from('contribution_logs')
      .update({
        user_id: requestedAssigneeId,
        metadata: {
          reassignmentId: requestId,
          scorePolicy,
          transferredFrom: currentAssigneeId,
        },
      })
      .eq('task_id', taskId)
      .eq('user_id', currentAssigneeId)

    if (transferError) throw new HttpError(400, 'Unable to transfer contribution scores', transferError.message)
    return
  }

  const splitRows = logs.map((log) => ({
    project_id: log.project_id,
    group_id: log.group_id,
    user_id: requestedAssigneeId,
    task_id: log.task_id,
    submission_version_id: log.submission_version_id,
    contribution_type: `${log.contribution_type}_split`,
    description: `50/50 reassignment split: ${log.description ?? log.contribution_type}`,
    points: Number(log.points ?? 0) / 2,
    metadata: {
      originalContributionId: log.id,
      reassignmentId: requestId,
      scorePolicy,
      splitFrom: currentAssigneeId,
    },
  }))

  for (const log of logs) {
    const { error: updateError } = await supabaseAdminClient
      .from('contribution_logs')
      .update({
        points: Number(log.points ?? 0) / 2,
        metadata: {
          ...(log.metadata ?? {}),
          reassignmentId: requestId,
          scorePolicy,
          splitWith: requestedAssigneeId,
        },
      })
      .eq('id', log.id)

    if (updateError) throw new HttpError(400, 'Unable to split original score', updateError.message)
  }

  const { error: insertError } = await supabaseAdminClient
    .from('contribution_logs')
    .insert(splitRows)

  if (insertError) throw new HttpError(400, 'Unable to create split score logs', insertError.message)
}

export async function listReassignmentRequests(userId, role) {
  let query = supabaseAdminClient
    .from('reassignment_requests')
    .select(role === 'professor'
      ? REQUEST_SELECT.replace('classes:class_id', 'classes:class_id!inner')
      : REQUEST_SELECT)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (role === 'professor') {
    query = query.eq('classes.professor_id', userId)
  } else {
    const { data: memberships, error } = await supabaseAdminClient
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) throw new HttpError(400, 'Unable to load your groups', error.message)
    const groupIds = (memberships ?? []).map((membership) => membership.group_id)
    if (groupIds.length === 0) return []
    query = query.or(`requested_by.eq.${userId},current_group_id.in.(${groupIds.join(',')}),requested_group_id.in.(${groupIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load reassignment requests', error.message)
  return normalizeRows(data ?? [])
}

export async function createReassignmentRequest(userId, role, payload) {
  const task = await getTaskContext(payload.taskId)
  await assertCanRequest(userId, role, task)
  await assertGroupMember(task.group_id, payload.currentAssigneeId)
  await assertGroupMember(task.group_id, payload.requestedAssigneeId)

  const { data: currentAssignment } = await supabaseAdminClient
    .from('task_assignments')
    .select('id')
    .eq('task_id', task.id)
    .eq('assignee_id', payload.currentAssigneeId)
    .maybeSingle()

  if (!currentAssignment) throw new HttpError(422, 'Current assignee is not assigned to this task')

  const { data, error } = await supabaseAdminClient
    .from('reassignment_requests')
    .insert({
      class_id: task.groups.class_id,
      project_id: task.project_id,
      task_id: task.id,
      requested_by: userId,
      current_assignee_id: payload.currentAssigneeId,
      requested_assignee_id: payload.requestedAssigneeId,
      current_group_id: task.group_id,
      requested_group_id: task.group_id,
      reason: payload.reason,
      score_policy: payload.scorePolicy,
      status: 'pending',
    })
    .select(REQUEST_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to create reassignment request', error.message)
  return (await normalizeRows([data]))[0]
}

export async function archiveReassignmentRequest(userId, role, requestId) {
  const request = await getRequest(requestId)
  if (role === 'professor') {
    await assertProfessorOwnsClass(request.class_id, userId)
  } else if (request.requested_by !== userId) {
    throw new HttpError(403, 'You can only archive your own reassignment requests')
  }

  const { data, error } = await supabaseAdminClient
    .from('reassignment_requests')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: userId,
    })
    .eq('id', requestId)
    .select(REQUEST_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to archive reassignment request', error.message)
  return (await normalizeRows([data]))[0]
}

export async function reviewReassignmentRequest(professorId, requestId, payload) {
  const request = await getRequest(requestId)
  await assertProfessorOwnsClass(request.class_id, professorId)
  if (request.status !== 'pending') throw new HttpError(409, 'This request has already been reviewed')

  const scorePolicy = payload.scorePolicy ?? request.score_policy

  if (payload.status === 'approved') {
    await assertGroupMember(request.current_group_id, request.requested_assignee_id)

    const { error: deleteError } = await supabaseAdminClient
      .from('task_assignments')
      .delete()
      .eq('task_id', request.task_id)
      .eq('assignee_id', request.current_assignee_id)

    if (deleteError) throw new HttpError(400, 'Unable to remove current assignee', deleteError.message)

    const { error: insertError } = await supabaseAdminClient
      .from('task_assignments')
      .upsert({
        task_id: request.task_id,
        assignee_id: request.requested_assignee_id,
        assigned_by: professorId,
      }, { onConflict: 'task_id,assignee_id' })

    if (insertError) throw new HttpError(400, 'Unable to assign task', insertError.message)

    await applyScorePolicy({
      currentAssigneeId: request.current_assignee_id,
      requestedAssigneeId: request.requested_assignee_id,
      requestId,
      scorePolicy,
      taskId: request.task_id,
    })
  }

  const { data, error } = await supabaseAdminClient
    .from('reassignment_requests')
    .update({
      status: payload.status,
      score_policy: scorePolicy,
      reviewed_by: professorId,
      reviewed_at: new Date().toISOString(),
      review_notes: payload.reviewNotes,
    })
    .eq('id', requestId)
    .select(REQUEST_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to review reassignment request', error.message)
  return (await normalizeRows([data]))[0]
}

export async function analyzeReassignmentRequest(professorId, requestId) {
  const request = await getRequest(requestId)
  await assertProfessorOwnsClass(request.class_id, professorId)

  const { allowedOverage, memberIds, memberScores, targetShare } = await analyzeGroupWorkload(request.current_group_id)
  const profiles = await getProfiles([...memberIds, request.current_assignee_id])

  const memberWorkloads = memberIds.map((userId) => {
    const share = Math.round((memberScores.get(userId) ?? 0) * 100) / 100
    let status = 'balanced'
    if (share > targetShare + allowedOverage) status = 'over'
    else if (share < targetShare - allowedOverage) status = 'under'
    return {
      name: profiles.get(userId)?.display_name ?? 'Unknown',
      share,
      status,
      userId,
    }
  })

  const balanced = memberWorkloads.every((member) => member.status === 'balanced')
  const currentAssigneeWorkload = memberWorkloads.find((member) => member.userId === request.current_assignee_id) ?? {
    name: profiles.get(request.current_assignee_id)?.display_name ?? 'Unknown',
    share: 0,
    status: 'balanced',
    userId: request.current_assignee_id,
  }

  const reason = classifyReason(request.reason)
  const activity = await analyzeAssigneeActivity(request.current_assignee_id, memberIds)
  const heuristic = buildHeuristicVerdict({ activity, currentAssigneeWorkload, reasonCategory: reason.category })

  const payload = {
    activity,
    heuristicSuggestion: heuristic.suggestion,
    heuristicVerdict: heuristic.verdict,
    reason: { category: reason.category, matchedKeywords: reason.matchedKeywords, text: request.reason },
    workload: { allowedOverage, balanced, currentAssignee: currentAssigneeWorkload, members: memberWorkloads, targetShare },
  }

  const aiInsight = await generateReassignmentAnalysisAiInsight(payload).catch(() => null)

  return {
    activity: payload.activity,
    reason: payload.reason,
    requestId,
    source: aiInsight ? 'ai' : 'heuristic',
    suggestion: aiInsight?.suggestion ?? heuristic.suggestion,
    summary: aiInsight?.summary ?? null,
    verdict: aiInsight?.verdict ?? heuristic.verdict,
    workload: payload.workload,
  }
}
