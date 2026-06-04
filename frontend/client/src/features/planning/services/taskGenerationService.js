import { apiRequest } from '../../../services/api/client'

export async function getGeneratedPlans(projectId, groupId) {
  const params = new URLSearchParams()
  if (projectId) params.set('projectId', projectId)
  if (groupId) params.set('groupId', groupId)
  const data = await apiRequest(`/planning?${params.toString()}`)
  return data.generations
}

export async function generatePlan(payload) {
  const data = await apiRequest('/planning/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.generation
}

export async function acceptPlan(id, mode = 'merge', tasks = []) {
  const data = await apiRequest(`/planning/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify({ mode, tasks }),
  })
  return data.generation
}
