import { apiRequest } from '../../../services/api/client'

function qs(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return params.toString()
}

export async function getAnalytics(filters = {}) {
  const query = qs(filters)
  const data = await apiRequest(`/analytics/dashboard${query ? `?${query}` : ''}`)
  return data.analytics
}

export async function getQuestionSets(classId) {
  const query = qs({ classId })
  const data = await apiRequest(`/analytics/question-sets${query ? `?${query}` : ''}`)
  return data.questionSets
}

export async function createQuestionSet(payload) {
  const data = await apiRequest('/analytics/question-sets', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.questionSet
}

export async function updateQuestionSet(id, payload) {
  const data = await apiRequest(`/analytics/question-sets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.questionSet
}

export async function createQuestion(payload) {
  const data = await apiRequest('/analytics/questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.question
}

export async function updateQuestion(id, payload) {
  const data = await apiRequest(`/analytics/questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.question
}

export async function getSurvey(projectId, groupId) {
  const data = await apiRequest(`/analytics/survey?${qs({ projectId, groupId })}`)
  return data.survey
}

export async function submitSurveyAnswers(payload) {
  const data = await apiRequest('/analytics/survey/answers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.result
}

export async function compareProjects(projectAId, projectBId) {
  const data = await apiRequest('/analytics/compare', {
    method: 'POST',
    body: JSON.stringify({ projectAId, projectBId }),
  })
  return data.comparison
}

export async function exportReport(payload) {
  const data = await apiRequest('/analytics/reports/export', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.report
}
