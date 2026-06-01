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

export async function getAnalyticsDashboard(userId, role, filters = {}) {
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
