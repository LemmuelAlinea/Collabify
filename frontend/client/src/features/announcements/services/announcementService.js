import { apiRequest } from '../../../services/api/client'

export async function getClassAnnouncements(classId) {
  const data = await apiRequest(`/announcements/class/${classId}`)
  return data.announcements
}

export async function createAnnouncement(payload) {
  const data = await apiRequest('/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.announcement
}

export async function updateAnnouncement(id, payload) {
  const data = await apiRequest(`/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.announcement
}

export async function deleteAnnouncement(id) {
  const data = await apiRequest(`/announcements/${id}`, {
    method: 'DELETE',
  })
  return data.announcement
}
