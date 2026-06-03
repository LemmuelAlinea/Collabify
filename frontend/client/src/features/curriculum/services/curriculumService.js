import { apiRequest } from '../../../services/api/client'

export async function getCurricula() {
  const data = await apiRequest('/curricula')
  return data.curricula
}

export async function getCurriculum(id) {
  const data = await apiRequest(`/curricula/${id}`)
  return data.curriculum
}

export async function createCurriculum(payload) {
  const data = await apiRequest('/curricula', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.curriculum
}

export async function updateCurriculum(id, payload) {
  const data = await apiRequest(`/curricula/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.curriculum
}

export async function archiveCurriculum(id) {
  const data = await apiRequest(`/curricula/${id}`, {
    method: 'DELETE',
  })
  return data.curriculum
}

export async function getCurriculumDownloadUrl(id) {
  const data = await apiRequest(`/curricula/${id}/download`)
  return data.url
}
