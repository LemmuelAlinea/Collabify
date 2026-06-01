import { apiRequest } from '../../../services/api/client'

function qs(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return params.toString()
}

export async function getProjectHealth(filters = {}) {
  const query = qs(filters)
  const data = await apiRequest(`/project-health${query ? `?${query}` : ''}`)
  return data.health
}

export async function evaluateProjectHealth(filters = {}) {
  const query = qs(filters)
  const data = await apiRequest(`/project-health/evaluate${query ? `?${query}` : ''}`, { method: 'POST' })
  return data.health
}
