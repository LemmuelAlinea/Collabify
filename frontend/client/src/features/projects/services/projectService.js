import { apiRequest } from '../../../services/api/client'

export async function getProjects() {
  const data = await apiRequest('/projects')
  return data.projects
}

export async function getProject(id) {
  const data = await apiRequest(`/projects/${id}`)
  return data.project
}

export async function getProjectDownloadUrl(id) {
  const data = await apiRequest(`/projects/${id}/download`)
  return data.url
}

export async function createProject(payload) {
  const data = await apiRequest('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.project
}

export async function updateProject(id, payload) {
  const data = await apiRequest(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.project
}

export async function archiveProject(id) {
  const data = await apiRequest(`/projects/${id}`, { method: 'DELETE' })
  return data.project
}

export async function reopenProject(id) {
  const data = await apiRequest(`/projects/${id}/reopen`, { method: 'POST' })
  return data.project
}

export async function rescheduleProjectDeadline(id, deadlineAt) {
  const data = await apiRequest(`/projects/${id}/deadline`, {
    method: 'PATCH',
    body: JSON.stringify({ deadlineAt }),
  })
  return data.project
}
