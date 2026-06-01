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
