import { apiRequest } from '../../../services/api/client'

export async function getReassignments() {
  const data = await apiRequest('/reassignments')
  return data.reassignments
}

export async function createReassignment(payload) {
  const data = await apiRequest('/reassignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.reassignment
}

export async function reviewReassignment(id, payload) {
  const data = await apiRequest(`/reassignments/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.reassignment
}

export async function archiveReassignment(id) {
  const data = await apiRequest(`/reassignments/${id}/archive`, {
    method: 'PATCH',
  })
  return data.reassignment
}

export async function analyzeReassignment(id) {
  const data = await apiRequest(`/reassignments/${id}/analyze`, {
    method: 'POST',
  })
  return data.analysis
}
