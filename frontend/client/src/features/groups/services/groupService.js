import { apiRequest } from '../../../services/api/client'

export async function getGroups(projectId) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
  const data = await apiRequest(`/groups${query}`)
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
