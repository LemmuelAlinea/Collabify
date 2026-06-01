import { apiRequest } from '../../../services/api/client'

function queryString(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function getSubmissions(filters) {
  const data = await apiRequest(`/submissions${queryString(filters)}`)
  return data.submissions
}

export async function createSubmissionVersion(payload) {
  const data = await apiRequest('/submissions/versions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.submission
}

export async function selectFinalVersion(id, versionId) {
  const data = await apiRequest(`/submissions/${id}/final-version`, {
    method: 'PATCH',
    body: JSON.stringify({ versionId }),
  })
  return data.submission
}

export async function reviewSubmission(id, payload) {
  const data = await apiRequest(`/submissions/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.submission
}

export async function getVersionDownloadUrl(versionId) {
  const data = await apiRequest(`/submissions/versions/${versionId}/download`)
  return data.url
}
