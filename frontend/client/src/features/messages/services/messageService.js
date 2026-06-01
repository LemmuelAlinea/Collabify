import { apiRequest } from '../../../services/api/client'

export async function getMessages(scope, chatId) {
  const params = new URLSearchParams({ scope, chatId })
  const data = await apiRequest(`/messages?${params.toString()}`)
  return data.messages
}

export async function sendMessage(payload) {
  const data = await apiRequest('/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.message
}

export async function deleteMessage(id, mode) {
  const data = await apiRequest(`/messages/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ mode }),
  })
  return data.message
}

export async function setMessagePin(id, isPinned) {
  const data = await apiRequest(`/messages/${id}/pin`, {
    method: 'PUT',
    body: JSON.stringify({ isPinned }),
  })
  return data.message
}
