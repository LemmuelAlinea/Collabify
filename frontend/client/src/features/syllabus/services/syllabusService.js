import { apiRequest } from '../../../services/api/client'

export async function getSyllabi() {
  const data = await apiRequest('/syllabi')
  return data.syllabi
}

export async function createSyllabus(payload) {
  const data = await apiRequest('/syllabi', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.syllabus
}

export async function updateSyllabus(id, payload) {
  const data = await apiRequest(`/syllabi/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.syllabus
}

export async function archiveSyllabus(id) {
  const data = await apiRequest(`/syllabi/${id}`, {
    method: 'DELETE',
  })
  return data.syllabus
}

export async function getSyllabusDownloadUrl(id) {
  const data = await apiRequest(`/syllabi/${id}/download`)
  return data.url
}
