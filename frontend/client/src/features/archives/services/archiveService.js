import { apiRequest } from '../../../services/api/client'

export async function getArchiveItems() {
  const data = await apiRequest('/archives')
  return data.items
}

export async function restoreArchiveItem(type, id) {
  const data = await apiRequest(`/archives/${type}/${id}/restore`, {
    method: 'POST',
  })
  return data.item
}

export async function deleteArchiveItem(type, id) {
  const data = await apiRequest(`/archives/${type}/${id}`, {
    method: 'DELETE',
  })
  return data.item
}
