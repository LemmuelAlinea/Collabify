import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'

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
