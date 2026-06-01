import { apiRequest } from '../../../services/api/client'

export async function getNotifications(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })

  const data = await apiRequest(`/notifications${params.toString() ? `?${params}` : ''}`)
  return data.notifications
}

export async function getUnreadNotificationCount() {
  const data = await apiRequest('/notifications/count')
  return data.unreadCount
}

export async function markNotificationsRead(ids) {
  const data = await apiRequest('/notifications/read', {
    method: 'PATCH',
    body: JSON.stringify({ ids }),
  })
  return data.notifications
}

export async function markAllNotificationsRead() {
  const data = await apiRequest('/notifications/read-all', { method: 'PATCH' })
  return data.notifications
}

export async function getActivity(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })

  const data = await apiRequest(`/notifications/activity${params.toString() ? `?${params}` : ''}`)
  return data.activity
}
