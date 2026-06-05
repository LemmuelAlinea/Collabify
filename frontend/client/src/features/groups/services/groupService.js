import { apiRequest } from '../../../services/api/client'

export async function getGroups(projectId) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
  const data = await apiRequest(`/groups${query}`)
  return data.groups
}

export async function getAvailableGroups(filters = {}) {
  const params = new URLSearchParams()
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.classId) params.set('classId', filters.classId)
  const query = params.toString() ? `?${params.toString()}` : ''
  const data = await apiRequest(`/groups/available${query}`)
  return data.groups
}

export async function getGroup(id) {
  const data = await apiRequest(`/groups/${id}`)
  return data.group
}

export async function createGroup(payload) {
  const data = await apiRequest('/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.group
}

export async function previewGroupCreation(payload) {
  return apiRequest('/groups/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function generateGroupCreation(payload) {
  const data = await apiRequest('/groups/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.groups
}

export async function joinGroup(id) {
  const data = await apiRequest(`/groups/${id}/join`, { method: 'POST' })
  return data.group
}

export async function getEligibleGroupMembers(id) {
  const data = await apiRequest(`/groups/${id}/eligible-members`)
  return data.members
}

export async function addGroupMember(id, userId) {
  const data = await apiRequest(`/groups/${id}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
  return data.group
}

export async function updateGroup(id, payload) {
  const data = await apiRequest(`/groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.group
}

export async function updateGroupMember(id, userId, payload) {
  const data = await apiRequest(`/groups/${id}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.group
}

export async function finalizeGroup(id) {
  return apiRequest(`/groups/${id}/finalize`, { method: 'POST' })
}

export async function getGroupPopQuiz(id) {
  const data = await apiRequest(`/groups/${id}/pop-quiz`)
  return data.quiz
}

export async function submitGroupPopQuiz(id, payload) {
  const data = await apiRequest(`/groups/${id}/pop-quiz`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.quiz
}

export async function updateStudentFormedGroupsStatus(payload) {
  const data = await apiRequest('/groups/student-formed/status', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.groups
}
