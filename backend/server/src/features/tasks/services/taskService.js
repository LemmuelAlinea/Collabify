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

  if (isProfessor) {
    await assertProfessorOwnsProject(payload.projectId, userId)
    if (payload.parentTaskId) {
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

    if (payload.parentTaskId) {
      const parent = await getTaskRow(payload.parentTaskId)
      if (parent.group_id !== group.id) throw new HttpError(422, 'Child task must belong to the same group as its parent')
    }

    const status = 'todo'
    const isMainTask = taskType === 'main'
    const difficulty = payload.difficulty ?? 'medium'
    const estimatedHours = isMainTask ? null : estimateHours(payload.priority, difficulty)

    const { data, error } = await supabaseAdminClient
      .from('tasks')
      .insert({
        project_id: payload.projectId,
        group_id: group.id,
        parent_task_id: payload.parentTaskId ?? null,
        created_by: userId,
        title: payload.title,
        description: payload.description,
        status,
        priority: payload.priority ?? 'medium',
        due_at: payload.dueAt,
        estimated_hours: estimatedHours,
        score_weight: null,
        progress: 0,
        completed_at: null,
        difficulty,
        complexity: payload.complexity ?? 1,
        applies_to_future_groups: isProfessor && payload.groupMode === 'future',
        metadata: { taskType: isMainTask ? 'main' : payload.parentTaskId ? 'child' : 'standalone' },
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
    if (assigneeIds.length > 0 && !assigneeIds.includes(userId)) {
      throw new HttpError(403, 'Only task assignees can update status for assigned tasks')
    }
  }

  const hasChildren = (await collectDescendantIds(taskId)).length > 0
  if (hasChildren && (payload.status || payload.progress !== undefined || payload.assigneeIds)) {
    throw new HttpError(422, 'Main tasks are containers only')
  }

  if (payload.parentTaskId) {
    if (payload.parentTaskId === taskId) throw new HttpError(422, 'A task cannot be its own parent')
    const parent = await getTaskRow(payload.parentTaskId)
    if (parent.group_id !== existing.group_id) throw new HttpError(422, 'Subtask must belong to the same group')
  }

  const mappedProgress = !isProfessor && payload.status
    ? progressForStatus(payload.status)
    : undefined

  const updatePayload = {
    parent_task_id: payload.parentTaskId,
    title: payload.title,
    description: payload.description,
    status: isProfessor ? undefined : payload.status,
    priority: payload.priority,
    due_at: payload.dueAt,
    estimated_hours: payload.difficulty || payload.priority ? estimateHours(payload.priority ?? existing.priority, payload.difficulty ?? existing.difficulty) : undefined,
    score_weight: undefined,
    progress: isProfessor ? undefined : mappedProgress ?? payload.progress,
    difficulty: payload.difficulty,
    complexity: payload.complexity,
    archived_at: payload.archived ? new Date().toISOString() : undefined,
    completed_at: !isProfessor && payload.status === 'done'
      ? new Date().toISOString()
      : !isProfessor && payload.status && payload.status !== 'done' ? null : undefined,
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key]
  })

  const { error } = await supabaseAdminClient
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId)

  if (error) throw new HttpError(400, 'Unable to update task', error.message)

  if (!isProfessor) await syncAssignments(taskId, existing.group_id, payload.assigneeIds, userId)

  const updatedTask = await getTaskRow(taskId)
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
