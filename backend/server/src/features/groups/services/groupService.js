import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'

const GROUP_SELECT = `
  id,
  class_id,
  project_id,
  name,
  description,
  created_by,
  is_locked,
  created_at,
  updated_at,
  classes:class_id (
    id,
    title,
    section,
    professor_id
  ),
  projects:project_id (
    id,
    title,
    work_mode,
    member_count,
    status,
    visibility_at
  ),
  group_chats (
    id,
    created_at
  )
`

const MEMBER_SELECT = `
  id,
  group_id,
  user_id,
  is_leader,
  status,
  joined_at,
  removed_at,
  users:user_id (
    email
  )
`

function normalizeMember(member, profileByUserId = new Map()) {
  const profile = profileByUserId.get(member.user_id)
  return {
    id: member.id,
    groupId: member.group_id,
    userId: member.user_id,
    isLeader: member.is_leader,
    status: member.status,
    joinedAt: member.joined_at,
    removedAt: member.removed_at,
    email: member.users?.email,
    displayName: profile?.display_name ?? member.users?.email,
    avatarUrl: profile?.avatar_url,
  }
}

function normalizeGroup(group, members = [], profileByUserId = new Map()) {
  return {
    id: group.id,
    classId: group.class_id,
    projectId: group.project_id,
    name: group.name,
    description: group.description,
    createdBy: group.created_by,
    isLocked: group.is_locked,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    class: group.classes ? {
      id: group.classes.id,
      name: group.classes.title,
      section: group.classes.section,
    } : null,
    project: group.projects ? {
      id: group.projects.id,
      title: group.projects.title,
      workMode: group.projects.work_mode,
      memberCount: group.projects.member_count,
      status: group.projects.status,
      visibilityAt: group.projects.visibility_at,
    } : null,
    groupChat: group.group_chats?.[0] ? {
      id: group.group_chats[0].id,
      createdAt: group.group_chats[0].created_at,
    } : null,
    members: members.map((member) => normalizeMember(member, profileByUserId)),
  }
}

async function getProfiles(userIds) {
  if (userIds.length === 0) return new Map()

  const { data } = await supabaseAdminClient
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', userIds)

  return new Map((data ?? []).map((profile) => [profile.user_id, profile]))
}

async function loadMembersByGroupIds(groupIds) {
  if (groupIds.length === 0) return { membersByGroupId: new Map(), profileByUserId: new Map() }

  const { data, error } = await supabaseAdminClient
    .from('group_members')
    .select(MEMBER_SELECT)
    .in('group_id', groupIds)
    .order('joined_at', { ascending: true })

  if (error) throw new HttpError(400, 'Unable to load group members', error.message)

  const profileByUserId = await getProfiles([...(new Set((data ?? []).map((member) => member.user_id)))])
  const membersByGroupId = new Map()

  for (const member of data ?? []) {
    const members = membersByGroupId.get(member.group_id) ?? []
    members.push(member)
    membersByGroupId.set(member.group_id, members)
  }

  return { membersByGroupId, profileByUserId }
}

async function ensureGroupChats(groups, fallbackUserId) {
  const missingChats = groups.filter((group) => !group.group_chats?.[0])
  if (missingChats.length === 0) return groups

  const { error } = await supabaseAdminClient
    .from('group_chats')
    .upsert(
      missingChats.map((group) => ({
        group_id: group.id,
        created_by: group.created_by ?? fallbackUserId,
      })),
      { onConflict: 'group_id' },
    )

  if (error) throw new HttpError(400, 'Unable to prepare group chats', error.message)

  const { data, error: reloadError } = await supabaseAdminClient
    .from('groups')
    .select(GROUP_SELECT)
    .in('id', groups.map((group) => group.id))

  if (reloadError) throw new HttpError(400, 'Unable to reload group chats', reloadError.message)
  return data ?? groups
}

async function getProjectForStudent(projectId, studentId, requiredClassId) {
  const { data: project, error } = await supabaseAdminClient
    .from('projects')
    .select('id, class_id, title, work_mode, member_count, status')
    .eq('id', projectId)
    .single()

  if (error || !project) throw new HttpError(404, 'Project not found')
  if (project.status === 'archived') throw new HttpError(404, 'Project not found')
  if (project.work_mode !== 'group') throw new HttpError(400, 'Only group projects can have groups')

  let classIds = []

  if (requiredClassId) {
    classIds = [requiredClassId]
  } else {
    const { data: releases, error: releaseError } = await supabaseAdminClient
      .from('project_class_releases')
      .select('class_id, release_at, is_active')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .lte('release_at', new Date().toISOString())

    if (releaseError) throw new HttpError(400, 'Unable to load project releases', releaseError.message)
    classIds = (releases ?? []).map((release) => release.class_id)
    if (classIds.length === 0) throw new HttpError(404, 'Project not found')
  }

  const { data: membership, error: membershipError } = await supabaseAdminClient
    .from('class_members')
    .select('class_id')
    .in('class_id', classIds)
    .eq('user_id', studentId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (membershipError) throw new HttpError(400, 'Unable to verify class membership', membershipError.message)
  if (!membership) throw new HttpError(403, 'You do not have permission to use this project')

  return { ...project, class_id: membership.class_id }
}

async function assertStudentHasNoProjectGroup(projectId, studentId) {
  const { data, error } = await supabaseAdminClient
    .from('group_members')
    .select('id, groups!inner(project_id)')
    .eq('user_id', studentId)
    .eq('status', 'active')
    .eq('groups.project_id', projectId)
    .limit(1)
    .maybeSingle()

  if (error) throw new HttpError(400, 'Unable to check project group membership', error.message)
  if (data) throw new HttpError(409, 'You already belong to a group for this project')
}

async function getGroup(groupId) {
  const { data, error } = await supabaseAdminClient
    .from('groups')
    .select(GROUP_SELECT)
    .eq('id', groupId)
    .single()

  if (error || !data) throw new HttpError(404, 'Group not found')
  return data
}

async function getGroupWithMembers(groupId) {
  const group = await getGroup(groupId)
  const [groupWithChat] = await ensureGroupChats([group], group.created_by)
  const { membersByGroupId, profileByUserId } = await loadMembersByGroupIds([groupId])
  return normalizeGroup(groupWithChat ?? group, membersByGroupId.get(groupId) ?? [], profileByUserId)
}

async function assertGroupManager(group, userId, role) {
  if (role === 'professor') {
    await assertProfessorOwnsClass(group.class_id, userId)
    return
  }

  const { data, error } = await supabaseAdminClient
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('is_leader', true)
    .maybeSingle()

  if (error || !data) throw new HttpError(403, 'Only group leaders can manage members')
}

export async function listGroups(userId, role, projectId) {
  let query

  if (role === 'professor') {
    query = supabaseAdminClient
      .from('groups')
      .select(GROUP_SELECT.replace('classes:class_id', 'classes:class_id!inner'))
      .eq('classes.professor_id', userId)

    if (projectId) query = query.eq('project_id', projectId)
    query = query.order('created_at', { ascending: false })
  } else {
    const { data: memberships, error } = await supabaseAdminClient
      .from('group_members')
      .select('group_id, groups!inner(project_id)')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) throw new HttpError(400, 'Unable to load your groups', error.message)

    const groupIds = (memberships ?? [])
      .filter((membership) => !projectId || membership.groups?.project_id === projectId)
      .map((membership) => membership.group_id)

    if (groupIds.length === 0) return []
    query = supabaseAdminClient
      .from('groups')
      .select(GROUP_SELECT)
      .in('id', groupIds)

    if (projectId) query = query.eq('project_id', projectId)
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load groups', error.message)

  const groupsWithChats = await ensureGroupChats(data ?? [], userId)
  const { membersByGroupId, profileByUserId } = await loadMembersByGroupIds(groupsWithChats.map((group) => group.id))
  return groupsWithChats.map((group) => normalizeGroup(group, membersByGroupId.get(group.id) ?? [], profileByUserId))
}

export async function getGroupDetails(userId, role, groupId) {
  const group = await getGroup(groupId)

  if (role === 'professor') {
    await assertProfessorOwnsClass(group.class_id, userId)
  } else {
    const { data, error } = await supabaseAdminClient
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (error || !data) throw new HttpError(404, 'Group not found')
  }

  return getGroupWithMembers(groupId)
}

export async function createGroup(userId, roleOrPayload, maybePayload) {
  const role = maybePayload ? roleOrPayload : 'student'
  const payload = maybePayload ?? roleOrPayload
  let project

  if (role === 'professor') {
    const { data, error } = await supabaseAdminClient
      .from('projects')
      .select('id, class_id, title, work_mode, member_count, status')
      .eq('id', payload.projectId)
      .single()

    if (error || !data) throw new HttpError(404, 'Project not found')
    if (data.work_mode !== 'group') throw new HttpError(400, 'Only group projects can have groups')
    await assertProfessorOwnsClass(data.class_id, userId)
    project = data
  } else {
    project = await getProjectForStudent(payload.projectId, userId)
    await assertStudentHasNoProjectGroup(payload.projectId, userId)
  }

  const { data: group, error } = await supabaseAdminClient
    .from('groups')
    .insert({
      class_id: project.class_id,
      project_id: project.id,
      name: payload.name,
      description: payload.description,
      created_by: userId,
    })
    .select(GROUP_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to create group', error.message)

  const { error: memberError } = role === 'student'
    ? await supabaseAdminClient
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        is_leader: true,
        status: 'active',
      })
    : { error: null }

  if (memberError) throw new HttpError(400, 'Unable to add group leader', memberError.message)

  await supabaseAdminClient.from('group_chats').upsert({
    group_id: group.id,
    created_by: userId,
  }, { onConflict: 'group_id' })

  return getGroupWithMembers(group.id)
}

export async function joinGroup(studentId, groupId) {
  const group = await getGroup(groupId)
  if (group.is_locked) throw new HttpError(409, 'This group is locked')

  await getProjectForStudent(group.project_id, studentId, group.class_id)
  await assertStudentHasNoProjectGroup(group.project_id, studentId)

  const { count, error: countError } = await supabaseAdminClient
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('status', 'active')

  if (countError) throw new HttpError(400, 'Unable to check group size', countError.message)
  if (count >= (group.projects?.member_count ?? 1)) throw new HttpError(409, 'This group is full')

  const { error } = await supabaseAdminClient
    .from('group_members')
    .upsert({
      group_id: groupId,
      user_id: studentId,
      is_leader: false,
      status: 'active',
      removed_at: null,
    }, { onConflict: 'group_id,user_id' })

  if (error) throw new HttpError(400, 'Unable to join group', error.message)
  return getGroupWithMembers(groupId)
}

export async function updateGroup(userId, role, groupId, payload) {
  const group = await getGroup(groupId)
  await assertGroupManager(group, userId, role)

  const updatePayload = {
    name: payload.name,
    description: payload.description,
    is_locked: payload.isLocked,
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key]
  })

  const { error } = await supabaseAdminClient
    .from('groups')
    .update(updatePayload)
    .eq('id', groupId)

  if (error) throw new HttpError(400, 'Unable to update group', error.message)
  return getGroupWithMembers(groupId)
}

export async function updateGroupMember(userId, role, groupId, memberUserId, payload) {
  const group = await getGroup(groupId)
  await assertGroupManager(group, userId, role)

  if (memberUserId === userId && payload.status === 'removed') {
    throw new HttpError(400, 'You cannot remove yourself from the group')
  }

  const updatePayload = {
    is_leader: payload.isLeader,
    status: payload.status,
    removed_at: payload.status === 'removed' ? new Date().toISOString() : payload.status === 'active' ? null : undefined,
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key]
  })

  const { error } = await supabaseAdminClient
    .from('group_members')
    .update(updatePayload)
    .eq('group_id', groupId)
    .eq('user_id', memberUserId)

  if (error) throw new HttpError(400, 'Unable to update group member', error.message)
  return getGroupWithMembers(groupId)
}
