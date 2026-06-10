import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'
import {
  scoreCommentCreated,
  scoreTaskCompleted,
  scoreTaskEdited,
} from '../../contributions/services/contributionScoringService.js'

const TASK_SELECT = `
  id,
  project_id,
  group_id,
  parent_task_id,
  created_by,
  title,
  description,
  status,
  priority,
  position,
  due_at,
  estimated_hours,
  score_weight,
  progress,
  completed_at,
  archived_at,
  difficulty,
  complexity,
  skill_category,
  applies_to_future_groups,
  ai_generated,
  metadata,
  created_at,
  updated_at,
  groups:group_id (
    id,
    name,
    class_id,
    project_id,
    classes:class_id (
      id,
      title,
      section,
      professor_id
    )
  ),
  projects:project_id (
    id,
    title
  )
`

const ASSIGNMENT_SELECT = `
  id,
  task_id,
  assignee_id,
  assigned_by,
  assigned_at,
  users:assignee_id (
    email
  )
`

const COMMENT_SELECT = `
  id,
  task_id,
  author_id,
  body,
  parent_comment_id,
  edited_at,
  created_at,
  updated_at,
  users:author_id (
    email
  )
`

const SUBMISSION_SELECT = `
  id,
  task_id,
  submitted_by,
  group_id,
  status,
  current_version_id,
  submitted_at,
  reviewed_by,
  reviewed_at,
  feedback,
  created_at,
  updated_at
`

const VERSION_SELECT = `
  id,
  submission_id,
  version,
  uploaded_by,
  storage_path,
  file_name,
  mime_type,
  file_size_bytes,
  notes,
  checksum,
  archived_at,
  archived_by,
  deleted_at,
  deleted_by,
  created_at,
  users:uploaded_by (
    email
  )
`

const VERSION_SELECT_LEGACY = `
  id,
  submission_id,
  version,
  uploaded_by,
  storage_path,
  file_name,
  mime_type,
  file_size_bytes,
  notes,
  checksum,
  created_at,
  users:uploaded_by (
    email
  )
`

const HISTORY_SELECT = `
  id,
  task_id,
  group_id,
  changed_by,
  old_status,
  new_status,
  created_at,
  users:changed_by (
    email
  )
`

function isMissingMigrationError(error) {
  return ['42703', '42P01'].includes(error?.code)
    || /column .* does not exist|relation .* does not exist/i.test(error?.message ?? '')
}

function normalizeAssignment(assignment, profileByUserId = new Map()) {
  const profile = profileByUserId.get(assignment.assignee_id)
  return {
    id: assignment.id,
    taskId: assignment.task_id,
    assigneeId: assignment.assignee_id,
    assignedBy: assignment.assigned_by,
    assignedAt: assignment.assigned_at,
    email: assignment.users?.email,
    displayName: profile?.display_name ?? assignment.users?.email,
    avatarUrl: profile?.avatar_url,
  }
}

function normalizeComment(comment, profileByUserId = new Map()) {
  const profile = profileByUserId.get(comment.author_id)
  return {
    id: comment.id,
    taskId: comment.task_id,
    authorId: comment.author_id,
    body: comment.body,
    parentCommentId: comment.parent_comment_id,
    editedAt: comment.edited_at,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    email: comment.users?.email,
    displayName: profile?.display_name ?? comment.users?.email,
    avatarUrl: profile?.avatar_url,
  }
}

function normalizeVersion(version, currentVersionId, profileByUserId = new Map()) {
  const profile = profileByUserId.get(version.uploaded_by)
  return {
    id: version.id,
    submissionId: version.submission_id,
    version: version.version,
    uploadedBy: version.uploaded_by,
    storagePath: version.storage_path,
    fileName: version.file_name,
    mimeType: version.mime_type,
    fileSizeBytes: version.file_size_bytes,
    notes: version.notes,
    checksum: version.checksum,
    archivedAt: version.archived_at,
    archivedBy: version.archived_by,
    deletedAt: version.deleted_at,
    deletedBy: version.deleted_by,
    createdAt: version.created_at,
    isFinal: version.id === currentVersionId,
    email: version.users?.email,
    displayName: profile?.display_name ?? version.users?.email,
    avatarUrl: profile?.avatar_url,
  }
}

function normalizeSubmission(submission, versions = [], profileByUserId = new Map()) {
  return {
    id: submission.id,
    taskId: submission.task_id,
    submittedBy: submission.submitted_by,
    groupId: submission.group_id,
    status: submission.status,
    currentVersionId: submission.current_version_id,
    submittedAt: submission.submitted_at,
    reviewedBy: submission.reviewed_by,
    reviewedAt: submission.reviewed_at,
    feedback: submission.feedback,
    createdAt: submission.created_at,
    updatedAt: submission.updated_at,
    versions: versions
      .filter((version) => !version.archived_at && !version.deleted_at)
      .map((version) => normalizeVersion(version, submission.current_version_id, profileByUserId)),
  }
}

function normalizeHistory(row, profileByUserId = new Map()) {
  const profile = profileByUserId.get(row.changed_by)
  return {
    id: row.id,
    taskId: row.task_id,
    groupId: row.group_id,
    changedBy: row.changed_by,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    createdAt: row.created_at,
    email: row.users?.email,
    displayName: profile?.display_name ?? row.users?.email ?? 'Unknown user',
    avatarUrl: profile?.avatar_url,
  }
}

function normalizeTask(task, assignments = [], comments = [], profileByUserId = new Map()) {
  return {
    id: task.id,
    projectId: task.project_id,
    groupId: task.group_id,
    parentTaskId: task.parent_task_id,
    createdBy: task.created_by,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    position: task.position,
    dueAt: task.due_at,
    estimatedHours: task.estimated_hours,
    scoreWeight: task.score_weight,
    groupScoreWeight: 0,
    memberScoreWeight: 0,
    progress: Number(task.progress ?? 0),
    completedAt: task.completed_at,
    archivedAt: task.archived_at,
    difficulty: task.difficulty ?? 'medium',
    complexity: Number(task.complexity ?? 1),
    skillCategory: task.skill_category ?? null,
    appliesToFutureGroups: task.applies_to_future_groups ?? false,
    aiGenerated: task.ai_generated,
    metadata: task.metadata,
    taskType: task.metadata?.taskType ?? (task.parent_task_id ? 'child' : 'standalone'),
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    group: task.groups ? {
      id: task.groups.id,
      name: task.groups.name,
      classId: task.groups.class_id,
      className: task.groups.classes?.title,
      section: task.groups.classes?.section,
    } : null,
    project: task.projects ? {
      id: task.projects.id,
      title: task.projects.title,
    } : null,
    assignments: assignments.map((assignment) => normalizeAssignment(assignment, profileByUserId)),
    comments: comments.map((comment) => normalizeComment(comment, profileByUserId)),
    children: [],
  }
}

function buildTaskTree(tasks) {
  const byId = new Map(tasks.map((task) => [task.id, { ...task, children: [] }]))
  const roots = []

  for (const task of byId.values()) {
    if (task.parentTaskId && byId.has(task.parentTaskId)) {
      byId.get(task.parentTaskId).children.push(task)
    } else {
      roots.push(task)
    }
  }

  return roots
}

function baseTaskWeight(task) {
  const explicitWeight = Number(task.scoreWeight ?? task.score_weight)
  if (explicitWeight > 0) return explicitWeight

  const priorityWeights = {
    low: 0.75,
    medium: 1,
    high: 1.35,
    urgent: 1.75,
  }

  const difficultyWeights = {
    easy: 2,
    medium: 4,
    hard: 7,
    critical: 10,
  }

  const hours = Number(task.estimatedHours) > 0 ? Number(task.estimatedHours) : difficultyWeights[task.difficulty] ?? 4
  const complexity = Number(task.complexity) > 0 ? Number(task.complexity) : 1
  return (difficultyWeights[task.difficulty] ?? 4) * hours * (priorityWeights[task.priority] ?? 1) * complexity
}

function normalizeGroupWeights(tasks) {
  const total = tasks.reduce((sum, task) => sum + baseTaskWeight(task), 0) || 1
  const weightsByTaskId = new Map()
  let used = 0

  tasks.forEach((task, index) => {
    const value = index === tasks.length - 1
      ? Math.max(0, Math.round((100 - used) * 100) / 100)
      : Math.round((baseTaskWeight(task) / total) * 10000) / 100
    weightsByTaskId.set(task.id, value)
    used += value
  })

  return weightsByTaskId
}

function flattenTree(tasks) {
  return tasks.flatMap((task) => [task, ...flattenTree(task.children ?? [])])
}

function applyScoring(tasks) {
  const flat = flattenTree(tasks)
  const leafTasks = flat.filter((task) => (task.children ?? []).length === 0)
    .filter((task) => !task.archivedAt && task.status !== 'cancelled')
  const byGroup = new Map()

  for (const task of leafTasks) {
    const rows = byGroup.get(task.groupId) ?? []
    rows.push(task)
    byGroup.set(task.groupId, rows)
  }

  for (const groupTasks of byGroup.values()) {
    const total = groupTasks.reduce((sum, task) => sum + baseTaskWeight(task), 0) || 1
    let used = 0

    groupTasks.forEach((task, index) => {
      const weight = index === groupTasks.length - 1
        ? Math.max(0, Math.round((100 - used) * 100) / 100)
        : Math.round((baseTaskWeight(task) / total) * 10000) / 100

      task.groupScoreWeight = weight
      used += weight
    })
  }

  const byAssignee = new Map()
  for (const task of leafTasks) {
    for (const assignment of task.assignments) {
      const rows = byAssignee.get(`${task.groupId}:${assignment.assigneeId}`) ?? []
      rows.push(task)
      byAssignee.set(`${task.groupId}:${assignment.assigneeId}`, rows)
    }
  }

  for (const memberTasks of byAssignee.values()) {
    const total = memberTasks.reduce((sum, task) => sum + baseTaskWeight(task), 0) || 1
    let used = 0

    memberTasks.forEach((task, index) => {
      const weight = index === memberTasks.length - 1
        ? Math.max(0, Math.round((100 - used) * 100) / 100)
        : Math.round((baseTaskWeight(task) / total) * 10000) / 100

      task.memberScoreWeight = Math.max(task.memberScoreWeight ?? 0, weight)
      used += weight
    })
  }

  return tasks
}

async function getProfiles(userIds) {
  if (userIds.length === 0) return new Map()

  const { data } = await supabaseAdminClient
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', [...new Set(userIds)])

  return new Map((data ?? []).map((profile) => [profile.user_id, profile]))
}

async function loadTaskExtras(taskIds) {
  if (taskIds.length === 0) {
    return { assignmentsByTaskId: new Map(), commentsByTaskId: new Map(), profileByUserId: new Map() }
  }

  const [{ data: assignments, error: assignmentError }, { data: comments, error: commentError }] = await Promise.all([
    supabaseAdminClient
      .from('task_assignments')
      .select(ASSIGNMENT_SELECT)
      .in('task_id', taskIds),
    supabaseAdminClient
      .from('task_comments')
      .select(COMMENT_SELECT)
      .in('task_id', taskIds)
      .order('created_at', { ascending: true }),
  ])

  if (assignmentError) throw new HttpError(400, 'Unable to load task assignments', assignmentError.message)
  if (commentError) throw new HttpError(400, 'Unable to load task comments', commentError.message)

  const userIds = [
    ...(assignments ?? []).map((assignment) => assignment.assignee_id),
    ...(comments ?? []).map((comment) => comment.author_id),
  ]
  const profileByUserId = await getProfiles(userIds)

  const assignmentsByTaskId = new Map()
  for (const assignment of assignments ?? []) {
    const rows = assignmentsByTaskId.get(assignment.task_id) ?? []
    rows.push(assignment)
    assignmentsByTaskId.set(assignment.task_id, rows)
  }

  const commentsByTaskId = new Map()
  for (const comment of comments ?? []) {
    const rows = commentsByTaskId.get(comment.task_id) ?? []
    rows.push(comment)
    commentsByTaskId.set(comment.task_id, rows)
  }

  return { assignmentsByTaskId, commentsByTaskId, profileByUserId }
}

async function getGroup(groupId) {
  const { data, error } = await supabaseAdminClient
    .from('groups')
    .select('id, class_id, project_id, name, classes:class_id (professor_id)')
    .eq('id', groupId)
    .single()

  if (error || !data) throw new HttpError(404, 'Group not found')
  return data
}

async function assertProfessorOwnsProject(projectId, professorId) {
  const { data, error } = await supabaseAdminClient
    .from('projects')
    .select('id, class_id, title, classes:class_id (professor_id)')
    .eq('id', projectId)
    .single()

  if (error || !data) throw new HttpError(404, 'Project not found')
  if (data.classes?.professor_id !== professorId) throw new HttpError(403, 'You do not own this project')
  return data
}

async function listProjectGroups(projectId) {
  const { data, error } = await supabaseAdminClient
    .from('groups')
    .select('id, class_id, project_id')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw new HttpError(400, 'Unable to load project groups', error.message)
  return data ?? []
}

async function listProjectMainTasksByTitle(projectId, title) {
  const { data, error } = await supabaseAdminClient
    .from('tasks')
    .select(TASK_SELECT)
    .eq('project_id', projectId)
    .eq('title', title)
    .is('parent_task_id', null)
    .is('archived_at', null)

  if (error) throw new HttpError(400, 'Unable to load parent main tasks', error.message)

  return (data ?? []).filter((task) => (task.metadata?.taskType ?? 'standalone') === 'main')
}

const SKILL_CATEGORY_KEYWORDS = {
  frontend: ['frontend', 'front-end', 'front end', 'ui component', 'react', 'vue', 'angular', 'css', 'html', 'javascript', 'typescript', 'webpage', 'web page', 'responsive', 'styling', 'component'],
  backend: ['backend', 'back-end', 'back end', 'api', 'endpoint', 'server', 'route', 'authentication', 'auth', 'express', 'node', 'middleware', 'integration'],
  ui_ux_design: ['ui/ux', 'ux', 'ui design', 'wireframe', 'mockup', 'prototype', 'figma', 'user interface', 'user experience', 'design system', 'layout design', 'visual design'],
  mobile_dev: ['mobile', 'android', 'ios', 'react native', 'flutter', 'app store', 'play store', 'smartphone'],
  database: ['database', 'schema', 'migration', 'sql', 'query', 'queries', 'table', 'supabase', 'postgres', 'data model'],
  qa_testing: ['test', 'testing', 'qa', 'bug', 'quality assurance', 'unit test', 'e2e', 'regression', 'test case'],
  documentation_technical_writing: ['documentation', 'docs', 'readme', 'technical writing', 'write-up', 'writeup', 'report', 'manual', 'guide'],
  project_management: ['project management', 'planning', 'schedule', 'scheduling', 'timeline', 'milestone', 'meeting', 'coordination', 'roadmap'],
}

export function detectSkillCategory(title, description) {
  const text = `${title ?? ''} ${description ?? ''}`.toLowerCase()
  if (!text.trim()) return null

  let bestCategory = null
  let bestScore = 0
  for (const [category, keywords] of Object.entries(SKILL_CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }
  return bestCategory
}

function estimateHours(priority = 'medium', difficulty = 'medium') {
  const priorityMultiplier = { low: 0.75, medium: 1, high: 1.35, urgent: 1.75 }[priority] ?? 1
  const difficultyHours = { easy: 2, medium: 4, hard: 7, critical: 10 }[difficulty] ?? 4
  return Math.max(1, Math.round(difficultyHours * priorityMultiplier))
}

function progressForStatus(status) {
  const progressByStatus = {
    todo: 0,
    blocked: 0,
    in_progress: 25,
    review: 50,
    done: 100,
    cancelled: 0,
  }

  return progressByStatus[status]
}

async function assertCanUseGroup(userId, role, groupId) {
  const group = await getGroup(groupId)

  if (role === 'professor') {
    await assertProfessorOwnsClass(group.class_id, userId)
    return group
  }

  const { data, error } = await supabaseAdminClient
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) throw new HttpError(403, 'You do not have permission to use this group')
  return group
}

async function assertAssigneesInGroup(groupId, assigneeIds = []) {
  if (assigneeIds.length === 0) return

  const { data, error } = await supabaseAdminClient
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .in('user_id', assigneeIds)

  if (error) throw new HttpError(400, 'Unable to verify task assignees', error.message)
  if ((data ?? []).length !== [...new Set(assigneeIds)].length) {
    throw new HttpError(422, 'Task assignees must be active group members')
  }
}

async function getTaskRow(taskId) {
  const { data, error } = await supabaseAdminClient
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', taskId)
    .single()

  if (error || !data) throw new HttpError(404, 'Task not found')
  return data
}

async function getTaskAssigneeIds(taskId) {
  const { data, error } = await supabaseAdminClient
    .from('task_assignments')
    .select('assignee_id')
    .eq('task_id', taskId)

  if (error) throw new HttpError(400, 'Unable to load task assignees', error.message)
  return (data ?? []).map((row) => row.assignee_id)
}

async function syncAssignments(taskId, groupId, assigneeIds, assignedBy) {
  if (assigneeIds === undefined) return

  const uniqueAssigneeIds = [...new Set(assigneeIds)]
  await assertAssigneesInGroup(groupId, uniqueAssigneeIds)

  const { error: deleteError } = await supabaseAdminClient
    .from('task_assignments')
    .delete()
    .eq('task_id', taskId)

  if (deleteError) throw new HttpError(400, 'Unable to update task assignments', deleteError.message)
  if (uniqueAssigneeIds.length === 0) return

  const { error } = await supabaseAdminClient
    .from('task_assignments')
    .insert(uniqueAssigneeIds.map((assigneeId) => ({
      task_id: taskId,
      assignee_id: assigneeId,
      assigned_by: assignedBy,
    })))

  if (error) throw new HttpError(400, 'Unable to assign task', error.message)
}

function groupByRows(rows, key) {
  const map = new Map()
  for (const row of rows ?? []) {
    const value = row[key]
    const existing = map.get(value) ?? []
    existing.push(row)
    map.set(value, existing)
  }
  return map
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

  const assigneeIds = [...new Set((assignmentsByTaskId.get(task.id) ?? []).map((assignment) => assignment.assignee_id))]
  if (assigneeIds.length === 0) return []
  const share = 1 / assigneeIds.length
  return assigneeIds.map((assigneeId) => [assigneeId, share])
}

async function assertClaimWithinGroupBalance(taskId, groupId, userId) {
  const [{ data: group, error: groupError }, { data: members, error: memberError }, { data: tasks, error: taskError }] = await Promise.all([
    supabaseAdminClient
      .from('groups')
      .select('id, member_limit, projects:project_id (member_count)')
      .eq('id', groupId)
      .single(),
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

  if (groupError) throw new HttpError(400, 'Unable to load group balance', groupError.message)
  if (memberError) throw new HttpError(400, 'Unable to load group members', memberError.message)
  if (taskError) throw new HttpError(400, 'Unable to load group tasks', taskError.message)

  const parentIds = new Set((tasks ?? []).map((task) => task.parent_task_id).filter(Boolean))
  const scoredTasks = (tasks ?? []).filter((task) => !parentIds.has(task.id) && task.status !== 'cancelled')
  const taskIds = scoredTasks.map((task) => task.id)
  const targetTask = scoredTasks.find((task) => task.id === taskId)
  if (!targetTask) throw new HttpError(422, 'Only task items can be claimed')

  const [{ data: assignments, error: assignmentError }, { data: approvedReassignments, error: reassignmentError }] = await Promise.all([
    taskIds.length
      ? supabaseAdminClient
        .from('task_assignments')
        .select('task_id, assignee_id')
        .in('task_id', taskIds)
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

  const memberScores = new Map((members ?? []).map((member) => [member.user_id, 0]))
  for (const task of scoredTasks) {
    if (task.id === taskId) continue
    const taskPoints = weightsByTaskId.get(task.id) ?? 0
    ownerSharesForTask(task, assignmentsByTaskId, reassignmentByTaskId).forEach(([ownerId, share]) => {
      memberScores.set(ownerId, (memberScores.get(ownerId) ?? 0) + (taskPoints * share))
    })
  }

  const groupCapacity = Math.max(1, Number(group.member_limit ?? group.projects?.member_count ?? members?.length ?? 1))
  const targetPoints = Math.round((100 / groupCapacity) * 100) / 100
  const allowedOverage = Math.max(5, targetPoints * 0.15)
  const maxPoints = targetPoints + allowedOverage
  const currentPoints = memberScores.get(userId) ?? 0
  const taskPoints = weightsByTaskId.get(taskId) ?? 0
  const nextPoints = currentPoints + taskPoints

  if (nextPoints > maxPoints) {
    throw new HttpError(
      422,
      `Claiming this task would exceed the fair share limit (${nextPoints.toFixed(2)} pts / ${maxPoints.toFixed(2)} pts).`,
    )
  }
}

async function normalizeRows(rows) {
  const taskIds = rows.map((task) => task.id)
  const { assignmentsByTaskId, commentsByTaskId, profileByUserId } = await loadTaskExtras(taskIds)

  return rows.map((task) => normalizeTask(
    task,
    assignmentsByTaskId.get(task.id) ?? [],
    commentsByTaskId.get(task.id) ?? [],
    profileByUserId,
  ))
}

async function loadTaskSubmission(taskId, groupId) {
  const { data: submission, error } = await supabaseAdminClient
    .from('task_submissions')
    .select(SUBMISSION_SELECT)
    .eq('task_id', taskId)
    .eq('group_id', groupId)
    .maybeSingle()

  if (error) throw new HttpError(400, 'Unable to load task submission', error.message)
  if (!submission) return null

  let { data: versions, error: versionError } = await supabaseAdminClient
    .from('submission_versions')
    .select(VERSION_SELECT)
    .eq('submission_id', submission.id)
    .is('deleted_at', null)
    .order('version', { ascending: false })

  if (versionError && isMissingMigrationError(versionError)) {
    const legacyResult = await supabaseAdminClient
      .from('submission_versions')
      .select(VERSION_SELECT_LEGACY)
      .eq('submission_id', submission.id)
      .order('version', { ascending: false })

    versions = legacyResult.data
    versionError = legacyResult.error
  }

  if (versionError) throw new HttpError(400, 'Unable to load task versions', versionError.message)

  const profileByUserId = await getProfiles((versions ?? []).map((version) => version.uploaded_by))
  return normalizeSubmission(submission, versions ?? [], profileByUserId)
}

async function loadTaskHistory(taskId) {
  const { data, error } = await supabaseAdminClient
    .from('task_status_history')
    .select(HISTORY_SELECT)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error && isMissingMigrationError(error)) return []
  if (error) throw new HttpError(400, 'Unable to load task history', error.message)

  const profileByUserId = await getProfiles((data ?? []).map((row) => row.changed_by).filter(Boolean))
  return (data ?? []).map((row) => normalizeHistory(row, profileByUserId))
}

async function logTaskStatusHistory(taskId, groupId, changedBy, oldStatus, newStatus) {
  if (!newStatus || oldStatus === newStatus) return

  const { error } = await supabaseAdminClient
    .from('task_status_history')
    .insert({
      task_id: taskId,
      group_id: groupId,
      changed_by: changedBy,
      old_status: oldStatus,
      new_status: newStatus,
    })

  if (error && isMissingMigrationError(error)) return
  if (error) throw new HttpError(400, 'Unable to save task status history', error.message)
}

export async function getTaskDetails(userId, role, taskId) {
  const row = await getTaskRow(taskId)
  await assertCanUseGroup(userId, role, row.group_id)

  const [task] = await normalizeRows([row])
  const [submission, history] = await Promise.all([
    loadTaskSubmission(task.id, task.groupId),
    loadTaskHistory(task.id),
  ])

  return {
    task,
    submission,
    history,
  }
}

async function upsertTaskProgress(taskId, groupId, status, progress, userId) {
  const { error } = await supabaseAdminClient
    .from('task_progress')
    .upsert({
      task_id: taskId,
      group_id: groupId,
      status,
      progress,
      completed_at: status === 'done' ? new Date().toISOString() : null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'task_id,group_id' })

  if (error) throw new HttpError(400, 'Unable to save task progress', error.message)
}

export async function listTasks(userId, role, filters = {}) {
  const select = role === 'professor'
    ? TASK_SELECT
      .replace('groups:group_id', 'groups:group_id!inner')
      .replace('classes:class_id', 'classes:class_id!inner')
    : TASK_SELECT

  let query = supabaseAdminClient
    .from('tasks')
    .select(select)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  if (filters.groupId) {
    await assertCanUseGroup(userId, role, filters.groupId)
    query = query.eq('group_id', filters.groupId)
  } else if (role === 'student') {
    const { data: memberships, error } = await supabaseAdminClient
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) throw new HttpError(400, 'Unable to load your groups', error.message)
    const groupIds = (memberships ?? []).map((membership) => membership.group_id)
    if (groupIds.length === 0) return []
    query = query.in('group_id', groupIds)
  } else {
    query = query.eq('groups.classes.professor_id', userId)
  }

  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.status) query = query.eq('status', filters.status)
  query = query.is('archived_at', null)

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load tasks', error.message)

  return applyScoring(buildTaskTree(await normalizeRows(data ?? [])))
}

export async function createTask(userId, role, payload) {
  const isProfessor = role === 'professor'
  const taskType = payload.taskType ?? (payload.parentTaskId ? 'child' : 'standalone')
  let targetGroups = []
  let parentTasksByGroupId = new Map()

  if (isProfessor) {
    await assertProfessorOwnsProject(payload.projectId, userId)
    if (payload.parentTaskGroupMode === 'all' && payload.parentTaskTitle) {
      const parentTasks = await listProjectMainTasksByTitle(payload.projectId, payload.parentTaskTitle)
      if (parentTasks.length === 0) throw new HttpError(422, 'No matching main tasks found for all groups')
      parentTasksByGroupId = new Map(parentTasks.map((task) => [task.group_id, task]))
      targetGroups = await Promise.all([...parentTasksByGroupId.keys()].map((groupId) => getGroup(groupId)))
    } else if (payload.parentTaskId) {
      const parent = await getTaskRow(payload.parentTaskId)
      targetGroups = [await getGroup(parent.group_id)]
    } else if (payload.groupMode === 'all' || payload.groupMode === 'future') {
      targetGroups = await listProjectGroups(payload.projectId)
    } else {
      if (!payload.groupIds?.length && payload.groupId) payload.groupIds = [payload.groupId]
      targetGroups = payload.groupIds?.length
        ? await Promise.all(payload.groupIds.map((groupId) => assertCanUseGroup(userId, role, groupId)))
        : await listProjectGroups(payload.projectId)
    }
    if (targetGroups.length === 0) throw new HttpError(422, 'This project has no groups yet')
  } else {
    if (!payload.groupId && payload.parentTaskId) {
      const parent = await getTaskRow(payload.parentTaskId)
      payload.groupId = parent.group_id
    }
    if (!payload.groupId) throw new HttpError(422, 'Group is required')
    targetGroups = [await assertCanUseGroup(userId, role, payload.groupId)]
  }

  const created = []

  for (const group of targetGroups) {
    if (group.project_id !== payload.projectId) throw new HttpError(422, 'Task project must match the group project')

    const groupParentTask = parentTasksByGroupId.get(group.id)
    const parentTaskId = groupParentTask?.id ?? payload.parentTaskId ?? null

    if (parentTaskId) {
      const parent = groupParentTask ?? await getTaskRow(parentTaskId)
      if (parent.group_id !== group.id) throw new HttpError(422, 'Child task must belong to the same group as its parent')
    }

    const status = 'todo'
    const isMainTask = taskType === 'main'
    const difficulty = payload.difficulty ?? 'medium'
    const estimatedHours = isMainTask ? null : payload.estimatedHours ?? estimateHours(payload.priority, difficulty)

    const { data, error } = await supabaseAdminClient
      .from('tasks')
      .insert({
        project_id: payload.projectId,
        group_id: group.id,
        parent_task_id: parentTaskId,
        created_by: userId,
        title: payload.title,
        description: payload.description,
        status,
        priority: payload.priority ?? 'medium',
        due_at: payload.dueAt,
        estimated_hours: estimatedHours,
        score_weight: isMainTask ? null : payload.scoreWeight ?? null,
        progress: 0,
        completed_at: null,
        difficulty,
        complexity: payload.complexity ?? 1,
        skill_category: payload.skillCategory ?? detectSkillCategory(payload.title, payload.description),
        applies_to_future_groups: isProfessor && payload.groupMode === 'future',
        metadata: { taskType: isMainTask ? 'main' : parentTaskId ? 'child' : 'standalone' },
      })
      .select(TASK_SELECT)
      .single()

    if (error) throw new HttpError(400, 'Unable to create task', error.message)
    if (!isProfessor) await syncAssignments(data.id, data.group_id, payload.assigneeIds, userId)
    created.push(await getTaskRow(data.id))
  }

  return created.length === 1 ? (await normalizeRows(created))[0] : applyScoring(buildTaskTree(await normalizeRows(created)))
}

export async function updateTask(userId, role, taskId, payload) {
  const existing = await getTaskRow(taskId)
  await assertCanUseGroup(userId, role, existing.group_id)

  const isProfessor = role === 'professor'
  if (!isProfessor && (payload.status || payload.progress !== undefined)) {
    const assigneeIds = await getTaskAssigneeIds(taskId)
    if (assigneeIds.length === 0 || !assigneeIds.includes(userId)) {
      throw new HttpError(403, 'Claim this task before updating its status')
    }
  }

  const hasChildren = (await collectDescendantIds(taskId)).length > 0
  if (hasChildren && (payload.status || payload.progress !== undefined || payload.assigneeIds)) {
    throw new HttpError(422, 'Main tasks are containers only')
  }

  if (!isProfessor && payload.assigneeIds !== undefined) {
    const existingAssigneeIds = await getTaskAssigneeIds(taskId)
    const requestedAssigneeIds = [...new Set(payload.assigneeIds)]

    if (existingAssigneeIds.length > 0) {
      throw new HttpError(403, 'Assigned tasks can only be changed through reassignment requests')
    }

    if (requestedAssigneeIds.length !== 1 || requestedAssigneeIds[0] !== userId) {
      throw new HttpError(403, 'You can only claim an unassigned task for yourself')
    }

    await assertClaimWithinGroupBalance(taskId, existing.group_id, userId)
  }

  if (payload.parentTaskId) {
    if (payload.parentTaskId === taskId) throw new HttpError(422, 'A task cannot be its own parent')
    const parent = await getTaskRow(payload.parentTaskId)
    if (parent.group_id !== existing.group_id) throw new HttpError(422, 'Subtask must belong to the same group')
  }

  const mappedProgress = !isProfessor && payload.status
    ? progressForStatus(payload.status)
    : undefined
  const archiveTimestamp = payload.archived === true
    ? new Date().toISOString()
    : payload.archived === false ? null : undefined

  const updatePayload = {
    parent_task_id: payload.parentTaskId,
    title: payload.title,
    description: payload.description,
    status: isProfessor ? undefined : payload.status,
    priority: payload.priority,
    due_at: payload.dueAt,
    estimated_hours: payload.estimatedHours !== undefined
      ? payload.estimatedHours
      : payload.difficulty || payload.priority ? estimateHours(payload.priority ?? existing.priority, payload.difficulty ?? existing.difficulty) : undefined,
    score_weight: payload.scoreWeight,
    progress: isProfessor ? undefined : mappedProgress ?? payload.progress,
    difficulty: payload.difficulty,
    complexity: payload.complexity,
    skill_category: payload.skillCategory,
    completed_at: !isProfessor && payload.status === 'done'
      ? new Date().toISOString()
      : !isProfessor && payload.status && payload.status !== 'done' ? null : undefined,
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key]
  })

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabaseAdminClient
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)

    if (error) throw new HttpError(400, 'Unable to update task', error.message)
  }

  if (archiveTimestamp !== undefined) {
    const ids = [taskId, ...(await collectDescendantIds(taskId))]
    const { error } = await supabaseAdminClient
      .from('tasks')
      .update({ archived_at: archiveTimestamp })
      .in('id', ids)

    if (error) throw new HttpError(400, 'Unable to update task archive status', error.message)
  }

  if (!isProfessor) await syncAssignments(taskId, existing.group_id, payload.assigneeIds, userId)

  const updatedTask = await getTaskRow(taskId)
  if (!isProfessor && payload.status && existing.status !== updatedTask.status) {
    await logTaskStatusHistory(taskId, existing.group_id, userId, existing.status, updatedTask.status)
  }
  await scoreTaskEdited({ actorId: userId, task: updatedTask })
  if (existing.status !== 'done' && updatedTask.status === 'done') {
    await scoreTaskCompleted({ actorId: userId, task: updatedTask })
  }

  return (await normalizeRows([updatedTask]))[0]
}

async function collectDescendantIds(taskId) {
  const { data, error } = await supabaseAdminClient
    .from('tasks')
    .select('id')
    .eq('parent_task_id', taskId)

  if (error) throw new HttpError(400, 'Unable to load subtasks', error.message)

  const childIds = (data ?? []).map((task) => task.id)
  const descendantIds = []

  for (const childId of childIds) {
    descendantIds.push(childId, ...(await collectDescendantIds(childId)))
  }

  return descendantIds
}

export async function deleteTask(userId, role, taskId) {
  const task = await getTaskRow(taskId)
  await assertCanUseGroup(userId, role, task.group_id)

  const ids = [taskId, ...(await collectDescendantIds(taskId))]
  const { error } = await supabaseAdminClient
    .from('tasks')
    .delete()
    .in('id', ids)

  if (error) throw new HttpError(400, 'Unable to delete task', error.message)
  return { id: taskId, deletedIds: ids }
}

export async function addTaskComment(userId, role, taskId, payload) {
  const task = await getTaskRow(taskId)
  await assertCanUseGroup(userId, role, task.group_id)

  const { data: comment, error } = await supabaseAdminClient
    .from('task_comments')
    .insert({
      task_id: taskId,
      author_id: userId,
      body: payload.body,
      parent_comment_id: payload.parentCommentId ?? null,
    })
    .select('id')
    .single()

  if (error) throw new HttpError(400, 'Unable to add task comment', error.message)
  await scoreCommentCreated({ actorId: userId, commentId: comment.id, task })
  return (await normalizeRows([await getTaskRow(taskId)]))[0]
}
