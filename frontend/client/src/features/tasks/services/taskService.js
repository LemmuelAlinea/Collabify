import { apiRequest } from '../../../services/api/client'

function queryString(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function getTasks(filters) {
  const data = await apiRequest(`/tasks${queryString(filters)}`)
  return data.tasks
}

export async function getTaskDetails(id) {
  return apiRequest(`/tasks/${id}/details`)
}

export async function createTask(payload) {
  const data = await apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.tasks ?? [data.task]
}

export async function updateTask(id, payload) {
  const data = await apiRequest(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.task
}

export async function deleteTask(id) {
  const data = await apiRequest(`/tasks/${id}`, { method: 'DELETE' })
  return data.task
}

export async function addTaskComment(id, payload) {
  const data = await apiRequest(`/tasks/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.task
}
