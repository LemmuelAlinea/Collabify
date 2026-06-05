import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'
import {
  calculateClassAnalytics,
  calculateGroupAnalytics,
  calculateProfessorAnalytics,
  calculateProjectAnalytics,
  calculateStudentAnalytics,
} from './analyticsCalculatorService.js'

const SET_SELECT = `
  id,
  class_id,
  professor_id,
  title,
  description,
  is_default,
  is_archived,
  created_at,
  updated_at
`

const QUESTION_SELECT = `
  id,
  question_set_id,
  asked_by,
  question,
  prompt,
  question_type,
  options,
  position,
  is_required,
  is_archived,
  created_at,
  updated_at
`

function normalizeQuestionSet(row, questions = []) {
  return {
    id: row.id,
    classId: row.class_id,
    professorId: row.professor_id,
    title: row.title,
    description: row.description,
    isDefault: row.is_default,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questions,
  }
}

function normalizeQuestion(row) {
  return {
    id: row.id,
    questionSetId: row.question_set_id,
    prompt: row.prompt ?? row.question,
    questionType: row.question_type,
    options: row.options ?? [],
    position: row.position,
    isRequired: row.is_required,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function assertCanViewProject(userId, role, projectId) {
  const { data: project, error } = await supabaseAdminClient
    .from('projects')
    .select('id, class_id, created_by')
    .eq('id', projectId)
    .single()

  if (error || !project) throw new HttpError(404, 'Project not found')

  if (role === 'professor') {
    await assertProfessorOwnsClass(project.class_id, userId)
    return project
  }

  const { data: member } = await supabaseAdminClient
    .from('class_members')
    .select('id')
    .eq('class_id', project.class_id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!member) throw new HttpError(403, 'You do not have permission to view this project')
  return project
}

async function assertCanViewGroup(userId, role, groupId) {
  const { data: group, error } = await supabaseAdminClient
    .from('groups')
    .select('id, class_id, project_id')
    .eq('id', groupId)
    .single()

  if (error || !group) throw new HttpError(404, 'Group not found')

  if (role === 'professor') {
    await assertProfessorOwnsClass(group.class_id, userId)
    return group
  }

  const { data: member } = await supabaseAdminClient
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!member) throw new HttpError(403, 'You do not have permission to view this group')
  return group
}

export async function listQuestionSets(userId, role, classId) {
  let query = supabaseAdminClient
    .from('analytics_question_sets')
    .select(SET_SELECT)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (role === 'professor') {
    query = query.eq('professor_id', userId)
    if (classId) query = query.eq('class_id', classId)
  } else if (classId) {
    query = query.or(`class_id.eq.${classId},class_id.is.null`)
  }

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load question sets', error.message)

  const setIds = (data ?? []).map((set) => set.id)
  const { data: questions } = setIds.length
    ? await supabaseAdminClient
      .from('analytics_questions')
      .select(QUESTION_SELECT)
      .in('question_set_id', setIds)
      .eq('is_archived', false)
      .order('position', { ascending: true })
    : { data: [] }

  const questionsBySetId = new Map()
  for (const question of questions ?? []) {
    const rows = questionsBySetId.get(question.question_set_id) ?? []
    rows.push(normalizeQuestion(question))
    questionsBySetId.set(question.question_set_id, rows)
  }

  return (data ?? []).map((set) => normalizeQuestionSet(set, questionsBySetId.get(set.id) ?? []))
}

export async function createQuestionSet(professorId, payload) {
  if (payload.classId) await assertProfessorOwnsClass(payload.classId, professorId)

  const { data, error } = await supabaseAdminClient
    .from('analytics_question_sets')
    .insert({
      class_id: payload.classId,
      professor_id: professorId,
      title: payload.title,
      description: payload.description,
      is_default: payload.isDefault,
    })
    .select(SET_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to create question set', error.message)
  return normalizeQuestionSet(data)
}

export async function updateQuestionSet(professorId, setId, payload) {
  const { data: existing } = await supabaseAdminClient
    .from('analytics_question_sets')
    .select('id, class_id, professor_id')
    .eq('id', setId)
    .single()

  if (!existing || existing.professor_id !== professorId) throw new HttpError(403, 'You do not have permission to manage this question set')
  if (payload.classId) await assertProfessorOwnsClass(payload.classId, professorId)

  const { data, error } = await supabaseAdminClient
    .from('analytics_question_sets')
    .update({
      class_id: payload.classId,
      title: payload.title,
      description: payload.description,
      is_default: payload.isDefault,
      is_archived: payload.isArchived,
    })
    .eq('id', setId)
    .select(SET_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to update question set', error.message)
  return normalizeQuestionSet(data)
}

export async function createQuestion(professorId, payload) {
  const { data: set } = await supabaseAdminClient
    .from('analytics_question_sets')
    .select('id, professor_id')
    .eq('id', payload.questionSetId)
    .single()

  if (!set || set.professor_id !== professorId) throw new HttpError(403, 'You do not have permission to manage this question set')

  const { data, error } = await supabaseAdminClient
    .from('analytics_questions')
    .insert({
      question_set_id: payload.questionSetId,
      asked_by: professorId,
      question: payload.prompt,
      prompt: payload.prompt,
      question_type: payload.questionType,
      options: payload.options,
      position: payload.position,
      is_required: payload.isRequired,
    })
    .select(QUESTION_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to create question', error.message)
  return normalizeQuestion(data)
}

export async function updateQuestion(professorId, questionId, payload) {
  const { data: question } = await supabaseAdminClient
    .from('analytics_questions')
    .select('id, asked_by')
    .eq('id', questionId)
    .single()

  if (!question || question.asked_by !== professorId) throw new HttpError(403, 'You do not have permission to manage this question')

  const { data, error } = await supabaseAdminClient
    .from('analytics_questions')
    .update({
      question: payload.prompt,
      prompt: payload.prompt,
      question_type: payload.questionType,
      options: payload.options,
      position: payload.position,
      is_required: payload.isRequired,
      is_archived: payload.isArchived,
    })
    .eq('id', questionId)
    .select(QUESTION_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to update question', error.message)
  return normalizeQuestion(data)
}

export async function getAvailableSurvey(userId, role, projectId, groupId) {
  await assertCanViewProject(userId, role, projectId)
  await assertCanViewGroup(userId, role, groupId)

  const [{ data: tasks }, { data: submissions }, { data: answered }, { data: project }] = await Promise.all([
    supabaseAdminClient.from('tasks').select('id, status').eq('project_id', projectId).eq('group_id', groupId),
    supabaseAdminClient.from('task_submissions').select('id, status').eq('group_id', groupId),
    supabaseAdminClient.from('analytics_answers').select('id').eq('project_id', projectId).eq('group_id', groupId).eq('student_id', userId).limit(1),
    supabaseAdminClient.from('projects').select('class_id, status').eq('id', projectId).single(),
  ])

  const completed = (tasks ?? []).length > 0 && (tasks ?? []).every((task) => task.status === 'done')
  const finalSubmitted = (submissions ?? []).some((submission) => ['submitted', 'reviewed', 'accepted'].includes(submission.status))
  const available = completed && finalSubmitted && !(answered ?? []).length
  const sets = await listQuestionSets(userId, role, project?.class_id)
  return { available, completed, finalSubmitted, alreadyAnswered: Boolean((answered ?? []).length), questionSet: sets[0] ?? null }
}

export async function submitSurveyAnswers(studentId, payload) {
  const survey = await getAvailableSurvey(studentId, 'student', payload.projectId, payload.groupId)
  if (!survey.available) throw new HttpError(409, 'Learning evaluation is not available')

  const questions = new Map((survey.questionSet?.questions ?? []).map((question) => [question.id, question]))
  const rows = payload.answers.map((answer) => {
    const question = questions.get(answer.questionId)
    if (!question) throw new HttpError(422, 'Question is not part of this evaluation')
    const rating = question.questionType === 'rating_scale' ? Number(answer.answerValue) : null

    return {
      question_id: answer.questionId,
      question_set_id: payload.questionSetId,
      project_id: payload.projectId,
      group_id: payload.groupId,
      student_id: studentId,
      asked_by: survey.questionSet.professorId,
      answered_by: studentId,
      answer: typeof answer.answerValue === 'string' ? answer.answerValue : JSON.stringify(answer.answerValue),
      answer_value: { value: answer.answerValue },
      rating,
      text_answer: typeof answer.answerValue === 'string' ? answer.answerValue : null,
    }
  })

  const { data, error } = await supabaseAdminClient
    .from('analytics_answers')
    .insert(rows)
    .select('id')

  if (error) throw new HttpError(400, 'Unable to submit evaluation', error.message)
  await calculateProjectAnalytics(payload.projectId)
  return { submitted: data.length }
}

function round(value, decimals = 2) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  const factor = 10 ** decimals
  return Math.round(number * factor) / factor
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, round(value)))
}

function dateLabel(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function isScoredTask(task, parentIds = new Set()) {
  return !parentIds.has(task.id) && task.status !== 'cancelled'
}

function baseTaskWeight(task) {
  const explicitWeight = Number(task.score_weight)
  if (explicitWeight > 0) return explicitWeight

  const priorityWeights = { low: 0.75, medium: 1, high: 1.35, urgent: 1.75 }
  const difficultyWeights = { easy: 2, medium: 4, hard: 7, critical: 10 }
  const hours = Number(task.estimated_hours) > 0 ? Number(task.estimated_hours) : difficultyWeights[task.difficulty] ?? 4
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

function buildEarnedPoints(groupTasks, assignmentsByTaskId, members) {
  const weightsByTaskId = normalizeGroupWeights(groupTasks)
  const pointsByUser = new Map(members.map((member) => [member.user_id, 0]))

  groupTasks.forEach((task) => {
    if (task.status !== 'done') return
    const assignees = (assignmentsByTaskId.get(task.id) ?? []).filter((assignment) => pointsByUser.has(assignment.assignee_id))
    if (!assignees.length) return
    const share = (weightsByTaskId.get(task.id) ?? 0) / assignees.length
    assignees.forEach((assignment) => {
      pointsByUser.set(assignment.assignee_id, round((pointsByUser.get(assignment.assignee_id) ?? 0) + share))
    })
  })

  return pointsByUser
}

function riskStatus({ blockedCount = 0, contributionBalance = 100, deadlineRisk = 0, overdueCount = 0, quizScore = null, completion = 0 }) {
  if (
    deadlineRisk >= 35
    || contributionBalance < 45
    || (quizScore !== null && quizScore < 50)
    || (blockedCount > 0 && completion < 70)
  ) return 'Critical'

  if (
    deadlineRisk >= 15
    || overdueCount > 0
    || contributionBalance < 70
    || (quizScore !== null && quizScore < 70)
    || blockedCount > 0
  ) return 'At risk'

  return 'On track'
}

function riskRank(status) {
  if (status === 'Critical') return 3
  if (status === 'At risk') return 2
  return 1
}

function averageOrNull(values) {
  const nums = values.map(Number).filter((value) => Number.isFinite(value))
  if (nums.length === 0) return null
  return round(nums.reduce((sum, value) => sum + value, 0) / nums.length)
}

function pct(part, total) {
  const numericTotal = Number(total)
  if (!Number.isFinite(numericTotal) || numericTotal <= 0) return 0
  return round((Number(part) / numericTotal) * 100)
}

function isMissingArchiveAnalyticsTable(error) {
  return ['42P01', '42703'].includes(error?.code) || /relation .* does not exist|column .* does not exist/i.test(error?.message ?? '')
}

async function loadQuizAttempts(groupIds) {
  if (!groupIds.length) return []

  const { data, error } = await supabaseAdminClient
    .from('group_pop_quiz_attempts')
    .select('group_id, user_id, score, status, completed_at')
    .in('group_id', groupIds)

  if (error && isMissingArchiveAnalyticsTable(error)) return []
  if (error) throw new HttpError(400, 'Unable to load analytics quiz scores', error.message)
  return data ?? []
}

function averageOrDefault(values, fallback = 0) {
  const value = averageOrNull(values)
  return value === null ? fallback : value
}

function deadlineRiskFor(project, tasks, completion) {
  const deadline = project.deadline_at ?? project.due_at
  if (!deadline) return { deadlineRisk: 0, expectedProgress: null, overdueCount: 0 }

  const now = new Date()
  const start = new Date(project.start_at ?? project.visibility_at ?? project.created_at)
  const end = new Date(deadline)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return { deadlineRisk: 0, expectedProgress: null, overdueCount: 0 }
  }
  const totalMs = Math.max(end.getTime() - start.getTime(), 1)
  const elapsed = clamp(((now.getTime() - start.getTime()) / totalMs) * 100)
  const overdueCount = tasks.filter((task) => task.status !== 'done' && task.due_at && new Date(task.due_at) < now).length
  const overdueProjectPenalty = now > end && completion < 100 ? 35 : 0
  const deadlineRisk = clamp(Math.max(0, elapsed - completion) + overdueProjectPenalty + overdueCount * 8)

  return { deadlineRisk, expectedProgress: elapsed, overdueCount }
}

function buildProgressTrend(project, tasks) {
  const parentIds = new Set(tasks.map((task) => task.parent_task_id).filter(Boolean))
  const workTasks = tasks.filter((task) => isScoredTask(task, parentIds))
  if (workTasks.length === 0) return []

  const start = new Date(project.start_at ?? project.visibility_at ?? project.created_at)
  const deadline = new Date(project.deadline_at ?? project.due_at ?? Date.now())
  const completedDates = workTasks
    .filter((task) => task.status === 'done' && task.completed_at)
    .map((task) => new Date(task.completed_at))
    .sort((left, right) => left - right)
  const today = new Date()
  const rawDates = [start, ...completedDates, today, deadline]
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((left, right) => left - right)
  const uniqueDates = []

  rawDates.forEach((date) => {
    const key = date.toISOString().slice(0, 10)
    if (!uniqueDates.some((item) => item.toISOString().slice(0, 10) === key)) uniqueDates.push(date)
  })

  return uniqueDates.slice(-8).map((date) => {
    const completed = workTasks.filter((task) => task.status === 'done' && task.completed_at && new Date(task.completed_at) <= date).length
    const totalMs = Math.max(deadline.getTime() - start.getTime(), 1)
    const expected = clamp(((date.getTime() - start.getTime()) / totalMs) * 100)
    return {
      label: dateLabel(date),
      completion: pct(completed, workTasks.length),
      expected,
    }
  })
}

function selectedOrFirst(requestedId, rows) {
  if (requestedId && rows.some((row) => row.id === requestedId)) return requestedId
  return rows[0]?.id ?? ''
}

async function getProfessorCalculatedDashboard(professorId, filters = {}) {
  const { data: classes, error: classError } = await supabaseAdminClient
    .from('classes')
    .select('id, title, code, subject, section')
    .eq('professor_id', professorId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (classError) throw new HttpError(400, 'Unable to load analytics classes', classError.message)
  if (!(classes ?? []).length) {
    return {
      filters: { selectedClassId: '', selectedProjectId: '', selectedGroupId: '', selectedStudentId: '', classes: [], projects: [], groups: [], students: [] },
      kpis: { activeProjects: 0, atRiskGroups: 0, criticalGroups: 0, averageCompletion: 0, averageQuizLearningScore: 0, averageContributionBalance: 0 },
      projectRows: [],
      groupRows: [],
      studentRows: [],
      taskStatusByGroup: [],
      projectProgressTrend: [],
    }
  }

  const selectedClassId = selectedOrFirst(filters.classId, classes)
  const { data: projects, error: projectError } = await supabaseAdminClient
    .from('projects')
    .select('id, class_id, title, description, status, start_at, deadline_at, due_at, visibility_at, created_at')
    .eq('class_id', selectedClassId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (projectError) throw new HttpError(400, 'Unable to load analytics projects', projectError.message)

  const selectedProjectId = filters.projectId && (projects ?? []).some((project) => project.id === filters.projectId) ? filters.projectId : ''
  const projectIds = (projects ?? []).map((project) => project.id)
  const selectedProject = (projects ?? []).find((project) => project.id === selectedProjectId) ?? null

  const [{ data: groups, error: groupError }, { data: tasks, error: taskError }] = await Promise.all([
    projectIds.length
      ? supabaseAdminClient
        .from('groups')
        .select('id, class_id, project_id, name, status, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: true })
      : { data: [] },
    projectIds.length
      ? supabaseAdminClient
        .from('tasks')
        .select('id, project_id, group_id, parent_task_id, title, status, priority, progress, estimated_hours, score_weight, due_at, completed_at, created_at, archived_at, difficulty, complexity, metadata')
        .in('project_id', projectIds)
        .is('archived_at', null)
      : { data: [] },
  ])

  if (groupError) throw new HttpError(400, 'Unable to load analytics groups', groupError.message)
  if (taskError) throw new HttpError(400, 'Unable to load analytics tasks', taskError.message)

  const groupIds = (groups ?? []).map((group) => group.id)
  const taskIds = (tasks ?? []).map((task) => task.id)
  const [{ data: members, error: memberError }, { data: assignments, error: assignmentError }, quizAttempts] = await Promise.all([
    groupIds.length
      ? supabaseAdminClient
        .from('group_members')
        .select('group_id, user_id, is_leader, status, users:user_id (email)')
        .in('group_id', groupIds)
        .eq('status', 'active')
      : { data: [] },
    taskIds.length
      ? supabaseAdminClient
        .from('task_assignments')
        .select('task_id, assignee_id')
        .in('task_id', taskIds)
      : { data: [] },
    loadQuizAttempts(groupIds),
  ])

  if (memberError) throw new HttpError(400, 'Unable to load analytics members', memberError.message)
  if (assignmentError) throw new HttpError(400, 'Unable to load analytics assignments', assignmentError.message)

  const userIds = [...new Set((members ?? []).map((member) => member.user_id))]
  const { data: profiles } = userIds.length
    ? await supabaseAdminClient
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds)
    : { data: [] }
  const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]))
  const projectById = new Map((projects ?? []).map((project) => [project.id, project]))
  const parentTaskIds = new Set((tasks ?? []).map((task) => task.parent_task_id).filter(Boolean))
  const tasksByGroupId = new Map()
  const groupsByProjectId = new Map()
  const membersByGroupId = new Map()
  const assignmentsByTaskId = new Map()
  const quizByGroupId = new Map()

  ;(tasks ?? []).filter((task) => isScoredTask(task, parentTaskIds)).forEach((task) => {
    const rows = tasksByGroupId.get(task.group_id) ?? []
    rows.push(task)
    tasksByGroupId.set(task.group_id, rows)
  })
  ;(groups ?? []).forEach((group) => {
    const rows = groupsByProjectId.get(group.project_id) ?? []
    rows.push(group)
    groupsByProjectId.set(group.project_id, rows)
  })
  ;(members ?? []).forEach((member) => {
    const rows = membersByGroupId.get(member.group_id) ?? []
    rows.push(member)
    membersByGroupId.set(member.group_id, rows)
  })
  ;(assignments ?? []).forEach((assignment) => {
    const rows = assignmentsByTaskId.get(assignment.task_id) ?? []
    rows.push(assignment)
    assignmentsByTaskId.set(assignment.task_id, rows)
  })
  ;(quizAttempts ?? []).filter((attempt) => attempt.status === 'completed').forEach((attempt) => {
    const rows = quizByGroupId.get(attempt.group_id) ?? []
    rows.push(attempt)
    quizByGroupId.set(attempt.group_id, rows)
  })

  const groupRowsAll = (groups ?? []).map((group) => {
    const project = projectById.get(group.project_id)
    const groupTasks = tasksByGroupId.get(group.id) ?? []
    const groupMembers = membersByGroupId.get(group.id) ?? []
    const assignedCompletionByUser = new Map(groupMembers.map((member) => [member.user_id, { assigned: 0, completed: 0 }]))

    groupTasks.forEach((task) => {
      const taskAssignments = assignmentsByTaskId.get(task.id) ?? []
      taskAssignments.forEach((assignment) => {
        const current = assignedCompletionByUser.get(assignment.assignee_id) ?? { assigned: 0, completed: 0 }
        assignedCompletionByUser.set(assignment.assignee_id, {
          assigned: current.assigned + 1,
          completed: current.completed + (task.status === 'done' ? 1 : 0),
        })
      })
    })

    const completion = pct(groupTasks.filter((task) => task.status === 'done').length, groupTasks.length)
    const { deadlineRisk, expectedProgress, overdueCount } = deadlineRiskFor(project ?? {}, groupTasks, completion)
    const earnedPointsByUser = buildEarnedPoints(groupTasks, assignmentsByTaskId, groupMembers)
    const contributionBalance = clamp([...earnedPointsByUser.values()].reduce((sum, value) => sum + value, 0))
    const completedQuizScores = (quizByGroupId.get(group.id) ?? []).map((attempt) => attempt.score)
    const quizLearningScore = averageOrNull(completedQuizScores)
    const blockedCount = groupTasks.filter((task) => task.status === 'blocked').length
    const status = riskStatus({ blockedCount, completion, contributionBalance, deadlineRisk, overdueCount, quizScore: quizLearningScore })

    return {
      id: group.id,
      groupId: group.id,
      groupName: group.name,
      projectId: group.project_id,
      projectName: project?.title ?? 'Project',
      classId: group.class_id,
      memberCount: groupMembers.length,
      taskCount: groupTasks.length,
      completedTasks: groupTasks.filter((task) => task.status === 'done').length,
      blockedTasks: blockedCount,
      overdueTasks: overdueCount,
      completion,
      expectedProgress,
      deadlineRisk,
      contributionBalance,
      quizLearningScore,
      status,
    }
  })

  const selectedGroupRows = groupRowsAll
    .filter((row) => !selectedProjectId || row.projectId === selectedProjectId)
    .filter((row) => !filters.groupId || row.groupId === filters.groupId)
  const selectedStudentRows = []

  selectedGroupRows.forEach((groupRow) => {
    const groupMembers = membersByGroupId.get(groupRow.groupId) ?? []
    const groupTasks = tasksByGroupId.get(groupRow.groupId) ?? []
    const assignedCompletionByUser = new Map(groupMembers.map((member) => [member.user_id, { assigned: 0, completed: 0 }]))
    const quizAttemptsByUser = new Map((quizByGroupId.get(groupRow.groupId) ?? []).map((attempt) => [attempt.user_id, attempt]))
    const earnedPointsByUser = buildEarnedPoints(groupTasks, assignmentsByTaskId, groupMembers)

    groupTasks.forEach((task) => {
      const taskAssignments = assignmentsByTaskId.get(task.id) ?? []
      taskAssignments.forEach((assignment) => {
        const current = assignedCompletionByUser.get(assignment.assignee_id) ?? { assigned: 0, completed: 0 }
        assignedCompletionByUser.set(assignment.assignee_id, {
          assigned: current.assigned + 1,
          completed: current.completed + (task.status === 'done' ? 1 : 0),
        })
      })
    })

    groupMembers.forEach((member) => {
      const assigned = assignedCompletionByUser.get(member.user_id) ?? { assigned: 0, completed: 0 }
      const taskCompletion = pct(assigned.completed, assigned.assigned)
      const contribution = earnedPointsByUser.get(member.user_id) ?? 0
      const quizScore = quizAttemptsByUser.get(member.user_id)?.score ?? null
      const status = riskStatus({ completion: taskCompletion, contributionBalance: contribution, deadlineRisk: groupRow.deadlineRisk, quizScore })
      const profile = profileByUserId.get(member.user_id)

      selectedStudentRows.push({
        id: `${groupRow.groupId}:${member.user_id}`,
        studentId: member.user_id,
        studentName: profile?.display_name ?? member.users?.email ?? 'Student',
        email: member.users?.email,
        groupId: groupRow.groupId,
        groupName: groupRow.groupName,
        projectId: groupRow.projectId,
        projectName: groupRow.projectName,
        assignedTasks: assigned.assigned,
        completedTasks: assigned.completed,
        taskCompletion,
        contributionScore: contribution,
        quizScore,
        status,
      })
    })
  })

  const projectRows = (projects ?? []).map((project) => {
    const projectGroups = groupsByProjectId.get(project.id) ?? []
    const projectGroupRows = groupRowsAll.filter((row) => row.projectId === project.id)
    const projectTasks = projectGroups.flatMap((group) => tasksByGroupId.get(group.id) ?? [])
    const completion = pct(projectTasks.filter((task) => task.status === 'done').length, projectTasks.length)
    const quizLearningScore = averageOrNull(projectGroupRows.map((row) => row.quizLearningScore).filter((value) => value !== null))
    const contributionBalance = averageOrDefault(projectGroupRows.map((row) => row.contributionBalance), 100)
    const deadlineRisk = averageOrDefault(projectGroupRows.map((row) => row.deadlineRisk), 0)
    const worstStatus = projectGroupRows.reduce((worst, row) => riskRank(row.status) > riskRank(worst) ? row.status : worst, 'On track')

    return {
      id: project.id,
      projectId: project.id,
      projectName: project.title,
      classId: project.class_id,
      groupCount: projectGroups.length,
      taskCount: projectTasks.length,
      completion,
      deadlineRisk,
      contributionBalance,
      quizLearningScore,
      status: worstStatus,
      deadlineAt: project.deadline_at ?? project.due_at,
    }
  })

  const selectedStudentId = filters.studentId && selectedStudentRows.some((row) => row.studentId === filters.studentId) ? filters.studentId : ''
  const studentRows = selectedStudentId
    ? selectedStudentRows.filter((row) => row.studentId === selectedStudentId)
    : selectedStudentRows
  const taskStatusByGroup = selectedGroupRows.map((row) => {
    const groupTasks = tasksByGroupId.get(row.groupId) ?? []
    return {
      groupName: row.groupName,
      todo: groupTasks.filter((task) => task.status === 'todo').length,
      inProgress: groupTasks.filter((task) => task.status === 'in_progress').length,
      review: groupTasks.filter((task) => task.status === 'review').length,
      done: groupTasks.filter((task) => task.status === 'done').length,
      blocked: groupTasks.filter((task) => task.status === 'blocked').length,
    }
  })
  const selectedProjectTasks = (tasks ?? []).filter((task) => task.project_id === selectedProjectId)
  const projectProgressTrend = selectedProject ? buildProgressTrend(selectedProject, selectedProjectTasks) : []
  const groupsForFilter = (groups ?? [])
    .filter((group) => !selectedProjectId || group.project_id === selectedProjectId)
    .map((group) => ({ id: group.id, name: group.name, projectId: group.project_id }))
  const studentsForFilter = selectedStudentRows
    .filter((row, index, rows) => rows.findIndex((item) => item.studentId === row.studentId) === index)
    .map((row) => ({ id: row.studentId, name: row.studentName }))

  return {
    filters: {
      selectedClassId,
      selectedProjectId,
      selectedGroupId: filters.groupId && groupsForFilter.some((group) => group.id === filters.groupId) ? filters.groupId : '',
      selectedStudentId,
      classes: classes.map((classItem) => ({
        id: classItem.id,
        name: [classItem.title, classItem.section].filter(Boolean).join(' - '),
      })),
      projects: (projects ?? []).map((project) => ({ id: project.id, name: project.title, classId: project.class_id })),
      groups: groupsForFilter,
      students: studentsForFilter,
    },
    kpis: {
      activeProjects: (projects ?? []).length,
      atRiskGroups: selectedGroupRows.filter((row) => row.status === 'At risk').length,
      criticalGroups: selectedGroupRows.filter((row) => row.status === 'Critical').length,
      averageCompletion: averageOrDefault(selectedGroupRows.map((row) => row.completion), 0),
      averageQuizLearningScore: averageOrDefault(selectedGroupRows.map((row) => row.quizLearningScore).filter((value) => value !== null), 0),
      averageContributionBalance: averageOrDefault(selectedGroupRows.map((row) => row.contributionBalance), 0),
    },
    projectRows: selectedProjectId ? projectRows.filter((row) => row.projectId === selectedProjectId) : projectRows,
    groupRows: selectedGroupRows,
    studentRows,
    taskStatusByGroup,
    projectProgressTrend,
  }
}

export async function getAnalyticsDashboard(userId, role, filters = {}) {
  if (role === 'professor') return getProfessorCalculatedDashboard(userId, filters)

  if (filters.projectId) await assertCanViewProject(userId, role, filters.projectId)
  if (filters.groupId) await assertCanViewGroup(userId, role, filters.groupId)
  if (filters.classId && role === 'professor') await assertProfessorOwnsClass(filters.classId, userId)

  if (filters.projectId) await calculateProjectAnalytics(filters.projectId)
  if (filters.groupId) await calculateGroupAnalytics(filters.groupId)
  if (role === 'student') await calculateStudentAnalytics(userId, filters.projectId)
  if (role === 'professor') await calculateProfessorAnalytics(userId)

  let studentQuery = supabaseAdminClient.from('student_analytics').select('*').order('generated_at', { ascending: false }).limit(80)
  if (role === 'student') studentQuery = studentQuery.eq('student_id', userId)
  if (role === 'professor' && filters.classId) studentQuery = studentQuery.eq('class_id', filters.classId)

  const [projectAnalytics, groupAnalytics, studentAnalytics, classAnalytics, professorAnalytics] = await Promise.all([
    supabaseAdminClient.from('project_analytics').select('*').order('generated_at', { ascending: false }).limit(80),
    supabaseAdminClient.from('group_analytics').select('*').order('generated_at', { ascending: false }).limit(80),
    studentQuery,
    filters.classId ? supabaseAdminClient.from('class_analytics').select('*').eq('class_id', filters.classId).maybeSingle() : { data: null },
    role === 'professor' ? supabaseAdminClient.from('professor_analytics').select('*').eq('professor_id', userId).maybeSingle() : { data: null },
  ])

  return {
    projectAnalytics: projectAnalytics.data ?? [],
    groupAnalytics: groupAnalytics.data ?? [],
    studentAnalytics: studentAnalytics.data ?? [],
    classAnalytics: classAnalytics.data ?? null,
    professorAnalytics: professorAnalytics.data ?? null,
  }
}

export async function compareProjects(userId, role, payload) {
  await assertCanViewProject(userId, role, payload.projectAId)
  await assertCanViewProject(userId, role, payload.projectBId)
  await Promise.all([calculateProjectAnalytics(payload.projectAId), calculateProjectAnalytics(payload.projectBId)])

  const { data, error } = await supabaseAdminClient
    .from('project_analytics')
    .select('*')
    .in('project_id', [payload.projectAId, payload.projectBId])

  if (error) throw new HttpError(400, 'Unable to compare projects', error.message)
  return data ?? []
}

export async function exportAnalyticsReport(userId, role, payload) {
  const dashboard = await getAnalyticsDashboard(userId, role, payload)
  const title = `${payload.reportType} analytics report`
  const rows = [
    ['Metric', 'Value'],
    ['Project analytics', dashboard.projectAnalytics.length],
    ['Group analytics', dashboard.groupAnalytics.length],
    ['Student analytics', dashboard.studentAnalytics.length],
  ]
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
  const content = payload.format === 'csv'
    ? csv
    : `<html><body><h1>${title}</h1><pre>${csv}</pre></body></html>`

  const { data, error } = await supabaseAdminClient
    .from('analytics_reports')
    .insert({
      report_type: payload.reportType,
      requested_by: userId,
      class_id: payload.classId,
      project_id: payload.projectId,
      group_id: payload.groupId,
      student_id: payload.studentId,
      format: payload.format,
      title,
      payload: dashboard,
    })
    .select('id')
    .single()

  if (error) throw new HttpError(400, 'Unable to save report', error.message)
  return { id: data.id, title, format: payload.format, content }
}
