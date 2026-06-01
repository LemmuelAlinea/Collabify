import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'

const NOTIFICATION_SELECT = `
  id,
  user_id,
  type,
  priority,
  title,
  body,
  entity_type,
  entity_id,
  class_id,
  project_id,
  group_id,
  task_id,
  action_url,
  metadata,
  read_at,
  created_at
`

const ACTIVITY_SELECT = `
  id,
  actor_id,
  class_id,
  project_id,
  group_id,
  entity_type,
  entity_id,
  action,
  metadata,
  created_at
`

function normalizeNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    priority: row.priority ?? 'medium',
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    classId: row.class_id,
    projectId: row.project_id,
    groupId: row.group_id,
    taskId: row.task_id,
    actionUrl: row.action_url,
    metadata: row.metadata ?? {},
    readAt: row.read_at,
    isRead: Boolean(row.read_at),
    createdAt: row.created_at,
  }
}

function normalizeActivity(row, profileByUserId = new Map()) {
  const profile = profileByUserId.get(row.actor_id)

  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: profile?.display_name ?? 'System',
    actorAvatarUrl: profile?.avatar_url,
    classId: row.class_id,
    projectId: row.project_id,
    groupId: row.group_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }
}

async function getProfiles(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return new Map()

  const { data } = await supabaseAdminClient
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', ids)

  return new Map((data ?? []).map((profile) => [profile.user_id, profile]))
}

async function getVisibleClassIds(userId, role) {
  if (role === 'professor') {
    const { data, error } = await supabaseAdminClient
      .from('classes')
      .select('id')
      .eq('professor_id', userId)

    if (error) throw new HttpError(400, 'Unable to load classes', error.message)
    return (data ?? []).map((row) => row.id)
  }

  const { data, error } = await supabaseAdminClient
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) throw new HttpError(400, 'Unable to load class memberships', error.message)
  return (data ?? []).map((row) => row.class_id)
}

async function getVisibleGroupIds(userId, role, classIds) {
  if (role === 'professor') {
    if (classIds.length === 0) return []
    const { data, error } = await supabaseAdminClient
      .from('groups')
      .select('id')
      .in('class_id', classIds)

    if (error) throw new HttpError(400, 'Unable to load groups', error.message)
    return (data ?? []).map((row) => row.id)
  }

  const { data, error } = await supabaseAdminClient
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) throw new HttpError(400, 'Unable to load groups', error.message)
  return (data ?? []).map((row) => row.group_id)
}

export async function listNotifications(userId, filters = {}) {
  let query = supabaseAdminClient
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: filters.sort === 'oldest' })
    .limit(150)

  if (filters.type) query = query.eq('type', filters.type)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.classId) query = query.eq('class_id', filters.classId)
  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.groupId) query = query.eq('group_id', filters.groupId)
  if (filters.unread === 'true') query = query.is('read_at', null)
  if (filters.search) query = query.or(`title.ilike.%${filters.search}%,body.ilike.%${filters.search}%`)

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load notifications', error.message)
  return (data ?? []).map(normalizeNotification)
}

export async function getUnreadCount(userId) {
  const { count, error } = await supabaseAdminClient
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw new HttpError(400, 'Unable to load unread count', error.message)
  return count ?? 0
}

export async function markNotificationsRead(userId, ids) {
  const timestamp = new Date().toISOString()
  const { data, error } = await supabaseAdminClient
    .from('notifications')
    .update({ read_at: timestamp })
    .eq('user_id', userId)
    .in('id', ids)
    .select(NOTIFICATION_SELECT)

  if (error) throw new HttpError(400, 'Unable to mark notifications read', error.message)

  await supabaseAdminClient
    .from('notification_reads')
    .upsert(ids.map((id) => ({ notification_id: id, user_id: userId, read_at: timestamp })), { onConflict: 'notification_id,user_id' })

  return (data ?? []).map(normalizeNotification)
}

export async function markAllNotificationsRead(userId) {
  const { data: unread } = await supabaseAdminClient
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .is('read_at', null)

  const ids = (unread ?? []).map((row) => row.id)
  if (ids.length === 0) return []
  return markNotificationsRead(userId, ids)
}

export async function listActivities(userId, role, filters = {}) {
  const classIds = await getVisibleClassIds(userId, role)
  const groupIds = await getVisibleGroupIds(userId, role, classIds)

  let query = supabaseAdminClient
    .from('activity_logs')
    .select(ACTIVITY_SELECT)
    .order('created_at', { ascending: false })
    .limit(200)

  if (filters.classId) query = query.eq('class_id', filters.classId)
  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.groupId) query = query.eq('group_id', filters.groupId)
  if (filters.taskId) query = query.eq('entity_id', filters.taskId).eq('entity_type', 'task')
  if (filters.actorId) query = query.eq('actor_id', filters.actorId)
  if (filters.entityType) query = query.eq('entity_type', filters.entityType)

  if (!filters.classId && !filters.groupId) {
    const clauses = [`actor_id.eq.${userId}`]
    if (classIds.length > 0) clauses.push(`class_id.in.(${classIds.join(',')})`)
    if (groupIds.length > 0) clauses.push(`group_id.in.(${groupIds.join(',')})`)
    query = query.or(clauses.join(','))
  }

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load activity', error.message)

  const profileByUserId = await getProfiles((data ?? []).map((row) => row.actor_id))
  return (data ?? []).map((row) => normalizeActivity(row, profileByUserId))
}
