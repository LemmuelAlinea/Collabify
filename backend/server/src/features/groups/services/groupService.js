import { HttpError } from '../../../core/errors/httpError.js'
import { env } from '../../../config/env.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'
import { loadStudentSkillSets } from '../../student-skills/services/studentSkillService.js'

const GROUP_SELECT = `
  id,
  class_id,
  project_id,
  name,
  description,
  created_by,
  is_locked,
  member_limit,
  creation_method,
  formation_status,
  status,
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
    memberLimit: group.member_limit,
    creationMethod: group.creation_method ?? 'manual',
    formationStatus: group.formation_status ?? null,
    status: group.status ?? 'active',
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

function normalizeQuizQuestion(question, index) {
  const options = Array.isArray(question?.options) ? question.options.slice(0, 4).map(String) : []
  while (options.length < 4) options.push(`Option ${options.length + 1}`)
  const rawCorrect = String(question?.correctOption ?? question?.answer ?? 'A').trim().toUpperCase()
  const correctOption = ['A', 'B', 'C', 'D'].includes(rawCorrect) ? rawCorrect : 'A'

  return {
    id: question?.id ?? `q${index + 1}`,
    prompt: String(question?.prompt ?? question?.question ?? `Which task detail is correct for item ${index + 1}?`).slice(0, 500),
    options: options.map((label, optionIndex) => ({
      key: ['A', 'B', 'C', 'D'][optionIndex],
      label,
    })),
    correctOption,
  }
}

function stripQuizAnswers(attempt) {
  return {
    id: attempt.id,
    groupId: attempt.group_id,
    userId: attempt.user_id,
    questions: (attempt.questions ?? []).map(({ correctOption, ...question }) => question),
    score: attempt.score,
    status: attempt.status,
    completedAt: attempt.completed_at,
  }
}

function fallbackQuiz(member, tasks) {
  const sourceTasks = tasks.length ? tasks : [{ title: 'Project work', description: 'Group project tasks', status: 'done' }]
  const first = sourceTasks[0]
  const second = sourceTasks[1] ?? first
  const third = sourceTasks[2] ?? second
  const descriptions = sourceTasks.map((task) => task.description).filter(Boolean)

  return [
    {
      id: 'q1',
      prompt: `What was the main deliverable expected from "${first.title}"?`,
      options: [
        first.description || `A completed output for ${first.title}`,
        'A new unrelated group membership request',
        'A profile picture update',
        'A notification cleanup only',
      ],
      correctOption: 'A',
    },
    {
      id: 'q2',
      prompt: `Which action best proves "${second.title}" was completed properly?`,
      options: [
        'Leaving the task without evidence',
        second.description || `Submitting the required ${second.title} output`,
        'Changing only the group name',
        'Ignoring the deadline',
      ],
      correctOption: 'B',
    },
    {
      id: 'q3',
      prompt: 'Why should finished project tasks be reviewed before final submission?',
      options: [
        'To remove all member assignments',
        'To skip project requirements',
        'To check quality, completeness, and alignment with the project goals',
        'To hide task history',
      ],
      correctOption: 'C',
    },
    {
      id: 'q4',
      prompt: `Which statement best connects "${third.title}" to project completion?`,
      options: [
        'It is unrelated once marked done',
        'It only changes the dashboard color',
        'It replaces every other project task',
        third.description || `${third.title} contributes a required project output`,
      ],
      correctOption: 'D',
    },
    {
      id: 'q5',
      prompt: 'What should a member understand about their completed tasks?',
      options: [
        descriptions[0] || 'The purpose, output, and quality expectations of the work they finished',
        'Only the task title, not the actual work',
        'Only who created the group',
        'Only the app navigation menu',
      ],
      correctOption: 'A',
    },
  ].map(normalizeQuizQuestion)
}

async function runPopQuizAi({ group, member, tasks }) {
  if (!env.n8nPopQuizWebhookUrl) return fallbackQuiz(member, tasks)

  const response = await fetch(env.n8nPopQuizWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: {
        group: { id: group.id, name: group.name, projectId: group.project_id },
        member,
        tasks,
      },
      instructions: [
        'Create serious project/task comprehension questions.',
        'Ask about purpose, requirements, deliverables, quality criteria, dependencies, risks, or implementation decisions.',
        'Do not ask which task the student was assigned to.',
        'Do not make every correct answer option A; distribute answers across A, B, C, and D.',
        'Return exactly 5 questions with exactly 4 options each.',
      ],
    }),
  })

  if (!response.ok) return fallbackQuiz(member, tasks)
  const data = await response.json().catch(() => null)
  const questions = data?.questions ?? data?.quiz?.questions ?? data
  if (!Array.isArray(questions)) return fallbackQuiz(member, tasks)
  return questions.slice(0, 5).map(normalizeQuizQuestion)
}

function getGroupMemberLimit(group) {
  return Number(group.member_limit ?? group.projects?.member_count ?? 1)
}

function chunkItems(items, size) {
  if (!size || size <= 0) return []
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function shuffleItems(items) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

function average(values) {
  const valid = values.map(Number).filter((value) => Number.isFinite(value))
  if (valid.length === 0) return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
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

const PROFICIENCY_RANK = { advanced: 3, intermediate: 2, beginner: 1 }

function getPrimarySkill(skills) {
  if (!skills?.length) return 'unspecified'
  return skills.reduce((best, current) => (
    (PROFICIENCY_RANK[current.proficiency] ?? 0) > (PROFICIENCY_RANK[best.proficiency] ?? 0) ? current : best
  )).skillKey
}

async function buildSkillBalancedOrder(students) {
  const skillsByUser = await loadStudentSkillSets(students.map((student) => student.userId))
  const buckets = groupBy(students, (student) => getPrimarySkill(skillsByUser.get(student.userId)))
  for (const [key, bucket] of buckets) buckets.set(key, shuffleItems(bucket))

  const interleaved = []
  let pushedAny = true
  while (pushedAny) {
    pushedAny = false
    for (const bucket of buckets.values()) {
      if (bucket.length) {
        interleaved.push(bucket.shift())
        pushedAny = true
      }
    }
  }
  return interleaved
}

function normalizeRange(values) {
  if (!values.length) return []
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (!Number.isFinite(max) || !Number.isFinite(min) || max === min) {
    return values.map(() => 100)
  }
  return values.map((value) => ((value - min) / (max - min)) * 100)
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

async function getProfessorProjectContext(userId, projectId) {
  const { data: project, error } = await supabaseAdminClient
    .from('projects')
    .select('id, class_id, title, work_mode, member_count, status, classes:class_id (id, title, section, professor_id)')
    .eq('id', projectId)
    .single()

  if (error || !project) throw new HttpError(404, 'Project not found')
  if (project.status === 'archived') throw new HttpError(404, 'Project not found')
  if (project.work_mode !== 'group') throw new HttpError(400, 'Only group projects can have groups')
  await assertProfessorOwnsClass(project.class_id, userId)
  return project
}

async function loadProjectEligibleStudents(project) {
  const alreadyGrouped = await getUsersAlreadyGroupedForProject(project.id)
  const { data, error } = await supabaseAdminClient
    .from('class_members')
    .select('id, user_id, status, role, users:user_id (email)')
    .eq('class_id', project.class_id)
    .eq('status', 'active')
    .eq('role', 'student')

  if (error) throw new HttpError(400, 'Unable to load class members', error.message)

  const eligible = (data ?? []).filter((member) => !alreadyGrouped.has(member.user_id))
  const profileByUserId = await getProfiles(eligible.map((member) => member.user_id))
  return eligible.map((member) => ({
    id: member.id,
    userId: member.user_id,
    email: member.users?.email,
    displayName: profileByUserId.get(member.user_id)?.display_name ?? member.users?.email,
    avatarUrl: profileByUserId.get(member.user_id)?.avatar_url,
  }))
}

async function loadClassStudents(classId) {
  const { data, error } = await supabaseAdminClient
    .from('class_members')
    .select('id, user_id, status, role, users:user_id (email)')
    .eq('class_id', classId)
    .eq('status', 'active')
    .eq('role', 'student')

  if (error) throw new HttpError(400, 'Unable to load class members', error.message)

  const profileByUserId = await getProfiles((data ?? []).map((member) => member.user_id))
  return (data ?? []).map((member) => ({
    id: member.id,
    userId: member.user_id,
    email: member.users?.email,
    displayName: profileByUserId.get(member.user_id)?.display_name ?? member.users?.email,
    avatarUrl: profileByUserId.get(member.user_id)?.avatar_url,
  }))
}

async function loadStudentPerformance(studentIds) {
  if (!studentIds.length) return new Map()

  const [contributionResult, analyticsResult] = await Promise.all([
    supabaseAdminClient
      .from('contribution_logs')
      .select('user_id, points')
      .in('user_id', studentIds),
    supabaseAdminClient
      .from('student_analytics')
      .select('student_id, contribution_score, task_completion, generated_at')
      .in('student_id', studentIds)
      .order('generated_at', { ascending: false }),
  ])

  if (contributionResult.error) throw new HttpError(400, 'Unable to load contribution data', contributionResult.error.message)
  if (analyticsResult.error) throw new HttpError(400, 'Unable to load analytics data', analyticsResult.error.message)

  const pointsByUser = new Map(studentIds.map((id) => [id, 0]))
  for (const row of contributionResult.data ?? []) {
    pointsByUser.set(row.user_id, (pointsByUser.get(row.user_id) ?? 0) + Number(row.points ?? 0))
  }

  const latestAnalytics = new Map()
  for (const row of analyticsResult.data ?? []) {
    if (!latestAnalytics.has(row.student_id)) latestAnalytics.set(row.student_id, row)
  }

  const pointScores = normalizeRange(studentIds.map((id) => pointsByUser.get(id) ?? 0))
  const taskScores = normalizeRange(studentIds.map((id) => Number(latestAnalytics.get(id)?.task_completion ?? 0)))

  return new Map(studentIds.map((id, index) => {
    const score = Math.round(average([pointScores[index] ?? 0, taskScores[index] ?? 0]) * 100) / 100
    return [id, {
      points: pointsByUser.get(id) ?? 0,
      taskCompletion: Number(latestAnalytics.get(id)?.task_completion ?? 0),
      score,
    }]
  }))
}

const MODE_GROUP_LABELS = {
  random: 'Random',
  similar_performance: 'Performance',
  skill_balanced: 'Skill-Balanced',
}

function buildPreviewGroups(students, memberCount, mode) {
  const groups = []
  const completeCount = Math.floor(students.length / memberCount)
  const usableStudents = students.slice(0, completeCount * memberCount)

  for (let index = 0; index < completeCount; index += 1) {
    const members = usableStudents.slice(index * memberCount, (index + 1) * memberCount)
    groups.push({
      name: mode === 'student_formed' ? `Group ${index + 1}` : `${MODE_GROUP_LABELS[mode] ?? 'Performance'} Group ${index + 1}`,
      description: null,
      members,
    })
  }

  return {
    groups,
    unassigned: students.slice(completeCount * memberCount),
  }
}

async function saveGeneratedGroups({ classId, projectId, userId, groups, mode, formationStatus = null }) {
  if (!Array.isArray(groups) || groups.length === 0) throw new HttpError(422, 'No generated groups to save')

  const rows = groups.map((group) => ({
    class_id: classId,
    project_id: projectId,
    name: group.name?.trim() || 'Group',
    description: group.description ?? null,
    created_by: userId,
    creation_method: mode,
    formation_status: formationStatus,
    is_locked: mode === 'student_formed' ? formationStatus !== 'open' : false,
  }))

  const { data, error } = await supabaseAdminClient
    .from('groups')
    .insert(rows)
    .select(GROUP_SELECT)

  if (error) throw new HttpError(400, 'Unable to save generated groups', error.message)

  const insertedGroups = data ?? []
  const memberRows = []
  insertedGroups.forEach((group, index) => {
    const previewMembers = groups[index]?.members ?? []
    previewMembers.forEach((member, memberIndex) => {
      memberRows.push({
        group_id: group.id,
        user_id: member.userId,
        is_leader: memberIndex === 0,
        status: 'active',
      })
    })
  })

  if (memberRows.length) {
    const { error: memberError } = await supabaseAdminClient.from('group_members').insert(memberRows)
    if (memberError) throw new HttpError(400, 'Unable to save generated group members', memberError.message)
  }

  await Promise.all(insertedGroups.map((group) => supabaseAdminClient.from('group_chats').upsert({
    group_id: group.id,
    created_by: userId,
  }, { onConflict: 'group_id' })))

  const { data: reloadedGroups, error: reloadError } = await supabaseAdminClient
    .from('groups')
    .select(GROUP_SELECT)
    .in('id', insertedGroups.map((group) => group.id))

  if (reloadError) throw new HttpError(400, 'Unable to reload generated groups', reloadError.message)

  const groupsWithChats = await ensureGroupChats(reloadedGroups ?? insertedGroups, userId)
  const { membersByGroupId, profileByUserId } = await loadMembersByGroupIds(groupsWithChats.map((group) => group.id))
  const orderById = new Map(insertedGroups.map((group, index) => [group.id, index]))

  return groupsWithChats
    .map((group) => normalizeGroup(group, membersByGroupId.get(group.id) ?? [], profileByUserId))
    .sort((left, right) => (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0))
}

export async function previewGroupCreation(userId, role, payload) {
  if (role !== 'professor') throw new HttpError(403, 'Only professors can generate groups')
  const project = await getProfessorProjectContext(userId, payload.projectId)
  const memberCount = Number(project.member_count ?? 1)
  if (memberCount <= 0) throw new HttpError(422, 'Invalid member count')
  const mode = payload.mode ?? 'manual'

  if (mode === 'student_formed') {
    const students = await loadClassStudents(project.class_id)
    const totalGroups = Math.floor(students.length / memberCount)
    return {
      project,
      memberCount,
      groups: Array.from({ length: totalGroups }, (_, index) => ({
        name: `Group ${index + 1}`,
        description: null,
        members: [],
      })),
      unassigned: students,
      totalGroups,
    }
  }

  const students = await loadProjectEligibleStudents(project)
  const orderedStudents = mode === 'random'
    ? shuffleItems(students)
    : mode === 'skill_balanced'
      ? await buildSkillBalancedOrder(students)
      : await (async () => {
        const scores = await loadStudentPerformance(students.map((student) => student.userId))
        return [...students].sort((left, right) => (scores.get(right.userId)?.score ?? 0) - (scores.get(left.userId)?.score ?? 0))
      })()

  const result = buildPreviewGroups(orderedStudents, memberCount, mode)
  return {
    project,
    memberCount,
    groups: result.groups.map((group, index) => ({
      ...group,
      name: group.name || `${MODE_GROUP_LABELS[mode] ?? 'Performance'} Group ${index + 1}`,
    })),
    unassigned: result.unassigned,
    totalGroups: result.groups.length,
  }
}

export async function saveGroupCreation(userId, role, payload) {
  if (role !== 'professor') throw new HttpError(403, 'Only professors can generate groups')
  const project = await getProfessorProjectContext(userId, payload.projectId)
  const memberCount = Number(project.member_count ?? 1)
  if (!Array.isArray(payload.groups) || payload.groups.length === 0) throw new HttpError(422, 'No generated groups to save')

  const eligibleStudents = await loadProjectEligibleStudents(project)
  const eligibleIds = new Set(eligibleStudents.map((student) => student.userId))
  const memberIds = new Set()

  payload.groups.forEach((group) => {
    if (!group?.members?.length && payload.mode !== 'student_formed') {
      throw new HttpError(422, 'Generated groups are incomplete')
    }
    if (payload.mode === 'student_formed' && (group.members?.length ?? 0) > 0) {
      throw new HttpError(422, 'Student-formed groups must be empty')
    }
    if (payload.mode !== 'student_formed' && group.members.length !== memberCount) {
      throw new HttpError(422, 'Each group must match the project member count')
    }
    group.members?.forEach((member) => {
      if (!eligibleIds.has(member.userId)) throw new HttpError(422, 'One or more selected members are not eligible')
      if (memberIds.has(member.userId)) throw new HttpError(409, 'A student cannot appear in more than one generated group')
      memberIds.add(member.userId)
    })
  })

  return saveGeneratedGroups({
    classId: project.class_id,
    projectId: project.id,
    userId,
    groups: payload.groups,
    mode: payload.mode ?? 'manual',
    formationStatus: payload.mode === 'student_formed' ? (payload.formationStatus ?? 'open') : null,
  })
}

export async function listAvailableStudentGroups(userId, role, filters = {}) {
  if (role !== 'student') throw new HttpError(403, 'Only students can view available groups')

  const { data: memberships, error: membershipError } = await supabaseAdminClient
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (membershipError) throw new HttpError(400, 'Unable to verify class membership', membershipError.message)

  const classIds = filters.classId ? [filters.classId] : (memberships ?? []).map((row) => row.class_id)
  if (!classIds.length) return []

  if (filters.projectId) {
    const alreadyGrouped = await getUsersAlreadyGroupedForProject(filters.projectId)
    if (alreadyGrouped.has(userId)) return []
  }

  let query = supabaseAdminClient
    .from('groups')
    .select(GROUP_SELECT)
    .in('class_id', classIds)
    .eq('creation_method', 'student_formed')
    .eq('formation_status', 'open')

  if (filters.projectId) query = query.eq('project_id', filters.projectId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new HttpError(400, 'Unable to load available groups', error.message)

  const groupsWithChats = await ensureGroupChats(data ?? [], userId)
  const { membersByGroupId, profileByUserId } = await loadMembersByGroupIds(groupsWithChats.map((group) => group.id))
  return groupsWithChats.map((group) => normalizeGroup(group, membersByGroupId.get(group.id) ?? [], profileByUserId))
}

export async function updateStudentFormedGroupsStatus(userId, role, payload) {
  if (role !== 'professor') throw new HttpError(403, 'Only professors can update group formation')
  const project = await getProfessorProjectContext(userId, payload.projectId)
  const formationStatus = payload.status
  if (!['open', 'closed', 'finalized'].includes(formationStatus)) throw new HttpError(422, 'Invalid formation status')

  const updatePayload = {
    formation_status: formationStatus,
    is_locked: formationStatus !== 'open',
  }

  const { error } = await supabaseAdminClient
    .from('groups')
    .update(updatePayload)
    .eq('project_id', project.id)
    .eq('creation_method', 'student_formed')

  if (error) throw new HttpError(400, 'Unable to update student-formed groups', error.message)
  return listGroups(userId, role, project.id)
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

function isWorkTask(task) {
  const taskType = task.metadata?.taskType ?? (task.parent_task_id ? 'child' : 'standalone')
  return taskType !== 'main'
}

async function loadGroupWorkTasks(groupId) {
  const { data, error } = await supabaseAdminClient
    .from('tasks')
    .select('id, title, description, status, priority, due_at, completed_at, metadata, parent_task_id')
    .eq('group_id', groupId)
    .is('archived_at', null)

  if (error) throw new HttpError(400, 'Unable to load group tasks', error.message)
  const parentTaskIds = new Set((data ?? []).map((task) => task.parent_task_id).filter(Boolean))
  return (data ?? []).filter((task) => isWorkTask(task) && !parentTaskIds.has(task.id))
}

async function loadTaskAssignments(taskIds) {
  if (!taskIds.length) return []
  const { data, error } = await supabaseAdminClient
    .from('task_assignments')
    .select('task_id, assignee_id')
    .in('task_id', taskIds)

  if (error) throw new HttpError(400, 'Unable to load task assignments', error.message)
  return data ?? []
}

async function loadQuizAttempt(groupId, userId) {
  const { data, error } = await supabaseAdminClient
    .from('group_pop_quiz_attempts')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new HttpError(400, 'Unable to load pop quiz', error.message)
  return data ? stripQuizAnswers(data) : null
}

export async function getGroupPopQuiz(userId, role, groupId) {
  const group = await getGroup(groupId)
  if (role === 'professor') await assertProfessorOwnsClass(group.class_id, userId)
  if (role === 'student') {
    const { data, error } = await supabaseAdminClient
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (error || !data) throw new HttpError(404, 'Group not found')
  }

  return loadQuizAttempt(groupId, userId)
}

export async function finalizeGroupProject(userId, role, groupId) {
  if (role !== 'student') throw new HttpError(403, 'Only student leaders can finalize projects')
  const group = await getGroup(groupId)
  const { membersByGroupId, profileByUserId } = await loadMembersByGroupIds([groupId])
  const activeMembers = (membersByGroupId.get(groupId) ?? []).filter((member) => member.status === 'active')
  const leader = activeMembers.find((member) => member.user_id === userId && member.is_leader)
  if (!leader) throw new HttpError(403, 'Only the group leader can finalize this project')

  const tasks = await loadGroupWorkTasks(groupId)
  if (tasks.length === 0) throw new HttpError(422, 'This group has no tasks to finalize')
  if (tasks.some((task) => task.status !== 'done')) throw new HttpError(422, 'All group tasks must be done before finalizing')

  const assignments = await loadTaskAssignments(tasks.map((task) => task.id))
  const assignmentsByMember = groupBy(assignments, (assignment) => assignment.assignee_id)
  const attempts = []

  for (const member of activeMembers) {
    const memberTaskIds = new Set((assignmentsByMember.get(member.user_id) ?? []).map((assignment) => assignment.task_id))
    const memberTasks = tasks.filter((task) => memberTaskIds.has(task.id))
    const quizTasks = (memberTasks.length ? memberTasks : tasks).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueAt: task.due_at,
      completedAt: task.completed_at,
    }))
    const memberPayload = {
      userId: member.user_id,
      displayName: profileByUserId.get(member.user_id)?.display_name ?? member.users?.email,
      email: member.users?.email,
    }
    const generatedQuestions = await runPopQuizAi({ group, member: memberPayload, tasks: quizTasks })
    const questions = generatedQuestions.length === 5
      ? generatedQuestions
      : [...generatedQuestions, ...fallbackQuiz(memberPayload, quizTasks)].slice(0, 5)

    const { data, error } = await supabaseAdminClient
      .from('group_pop_quiz_attempts')
      .upsert({
        group_id: groupId,
        user_id: member.user_id,
        generated_by: userId,
        questions,
        answers: [],
        score: 0,
        status: 'in_progress',
        completed_at: null,
      }, { onConflict: 'group_id,user_id' })
      .select('*')
      .single()

    if (error) throw new HttpError(400, 'Unable to save pop quiz', error.message)
    attempts.push(data)
  }

  const { error: updateError } = await supabaseAdminClient
    .from('groups')
    .update({ status: 'finished' })
    .eq('id', groupId)

  if (updateError) throw new HttpError(400, 'Unable to finalize group', updateError.message)

  return {
    group: await getGroupWithMembers(groupId),
    quiz: stripQuizAnswers(attempts.find((attempt) => attempt.user_id === userId)),
  }
}

export async function submitGroupPopQuiz(userId, role, groupId, payload) {
  if (role !== 'student') throw new HttpError(403, 'Only students can submit pop quizzes')
  const { data: membership, error: membershipError } = await supabaseAdminClient
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError || !membership) throw new HttpError(404, 'Group not found')

  const { data: attempt, error } = await supabaseAdminClient
    .from('group_pop_quiz_attempts')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new HttpError(400, 'Unable to load pop quiz', error.message)
  if (!attempt) throw new HttpError(404, 'Pop quiz not found')
  if (attempt.status === 'completed') return stripQuizAnswers(attempt)

  const answers = Array.isArray(payload.answers) ? payload.answers : []
  const normalizedAnswers = (attempt.questions ?? []).map((question) => {
    const answer = answers.find((item) => item.questionId === question.id)
    return {
      questionId: question.id,
      selectedOption: String(answer?.selectedOption ?? '').toUpperCase(),
      correctOption: question.correctOption,
      isCorrect: String(answer?.selectedOption ?? '').toUpperCase() === question.correctOption,
    }
  })
  const score = normalizedAnswers.filter((answer) => answer.isCorrect).length * 20

  const { data: saved, error: saveError } = await supabaseAdminClient
    .from('group_pop_quiz_attempts')
    .update({
      answers: normalizedAnswers,
      score,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', attempt.id)
    .select('*')
    .single()

  if (saveError) throw new HttpError(400, 'Unable to submit pop quiz', saveError.message)
  return stripQuizAnswers(saved)
}

async function assertProfessorCanManageGroup(group, professorId, role) {
  if (role !== 'professor') throw new HttpError(403, 'Only professors can manage this group')
  await assertProfessorOwnsClass(group.class_id, professorId)
}

async function countActiveGroupMembers(groupId) {
  const { count, error } = await supabaseAdminClient
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('status', 'active')

  if (error) throw new HttpError(400, 'Unable to check group size', error.message)
  return count ?? 0
}

async function getUsersAlreadyGroupedForProject(projectId) {
  const { data, error } = await supabaseAdminClient
    .from('group_members')
    .select('user_id, groups!inner(project_id)')
    .eq('status', 'active')
    .eq('groups.project_id', projectId)

  if (error) throw new HttpError(400, 'Unable to check project memberships', error.message)
  return new Set((data ?? []).map((row) => row.user_id))
}

function normalizeEligibleMember(member, profileByUserId = new Map()) {
  const profile = profileByUserId.get(member.user_id)
  return {
    id: member.id,
    userId: member.user_id,
    email: member.users?.email,
    displayName: profile?.display_name ?? member.users?.email,
    avatarUrl: profile?.avatar_url,
  }
}

export async function getEligibleGroupMembers(userId, role, groupId) {
  const group = await getGroup(groupId)
  await assertProfessorCanManageGroup(group, userId, role)

  const alreadyGrouped = await getUsersAlreadyGroupedForProject(group.project_id)
  const { data, error } = await supabaseAdminClient
    .from('class_members')
    .select('id, user_id, status, role, users:user_id (email)')
    .eq('class_id', group.class_id)
    .eq('status', 'active')
    .eq('role', 'student')

  if (error) throw new HttpError(400, 'Unable to load class members', error.message)

  const eligible = (data ?? []).filter((member) => !alreadyGrouped.has(member.user_id))
  const profileByUserId = await getProfiles(eligible.map((member) => member.user_id))
  return eligible.map((member) => normalizeEligibleMember(member, profileByUserId))
}

export async function addGroupMember(userId, role, groupId, memberUserId) {
  const group = await getGroup(groupId)
  await assertProfessorCanManageGroup(group, userId, role)

  const activeCount = await countActiveGroupMembers(groupId)
  if (activeCount >= getGroupMemberLimit(group)) throw new HttpError(409, 'This group is full')

  const { data: classMember, error: classMemberError } = await supabaseAdminClient
    .from('class_members')
    .select('id')
    .eq('class_id', group.class_id)
    .eq('user_id', memberUserId)
    .eq('status', 'active')
    .maybeSingle()

  if (classMemberError) throw new HttpError(400, 'Unable to verify class member', classMemberError.message)
  if (!classMember) throw new HttpError(422, 'Member must belong to the project class')

  const alreadyGrouped = await getUsersAlreadyGroupedForProject(group.project_id)
  if (alreadyGrouped.has(memberUserId)) throw new HttpError(409, 'Member already belongs to a group for this project')

  const { error } = await supabaseAdminClient
    .from('group_members')
    .upsert({
      group_id: groupId,
      user_id: memberUserId,
      is_leader: false,
      status: 'active',
      removed_at: null,
    }, { onConflict: 'group_id,user_id' })

  if (error) throw new HttpError(400, 'Unable to add group member', error.message)
  return getGroupWithMembers(groupId)
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
      creation_method: role === 'professor' ? 'manual' : 'manual',
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
  if (group.creation_method !== 'student_formed') throw new HttpError(403, 'This group cannot be joined')
  if (group.formation_status !== 'open') throw new HttpError(409, 'This group is closed')
  if (group.is_locked) throw new HttpError(409, 'This group is locked')

  await getProjectForStudent(group.project_id, studentId, group.class_id)
  await assertStudentHasNoProjectGroup(group.project_id, studentId)

  const { count, error: countError } = await supabaseAdminClient
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('status', 'active')

  if (countError) throw new HttpError(400, 'Unable to check group size', countError.message)
  if (count >= getGroupMemberLimit(group)) throw new HttpError(409, 'This group is full')

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
  if (payload.memberLimit !== undefined && role !== 'professor') {
    throw new HttpError(403, 'Only professors can update group member count')
  }
  if (payload.memberLimit !== undefined && payload.memberLimit !== null) {
    const activeCount = await countActiveGroupMembers(groupId)
    if (Number(payload.memberLimit) < activeCount) {
      throw new HttpError(422, 'Member count cannot be lower than current active members')
    }
  }

  const updatePayload = {
    name: payload.name,
    description: payload.description,
    is_locked: payload.isLocked,
    member_limit: payload.memberLimit,
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
