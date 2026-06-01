import { apiRequest } from '../../../services/api/client'

export async function analyzeProject(projectId) {
  const data = await apiRequest(`/validations/projects/${projectId}/analyze`, { method: 'POST' })
  return data.validation
}

export async function getProjectValidations(projectId) {
  const data = await apiRequest(`/validations/projects/${projectId}`)
  return data.validations
}

export async function updateValidationDecision(id, decision) {
  const data = await apiRequest(`/validations/${id}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({ decision }),
  })
  return data.validation
}
