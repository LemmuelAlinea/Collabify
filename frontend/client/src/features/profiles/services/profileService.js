import { apiRequest } from '../../../services/api/client'

export async function getOwnProfile() {
  const data = await apiRequest('/profiles/me')
  return data.profile
}

export async function updateOwnProfile(payload) {
  const data = await apiRequest('/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return data.profile
}
