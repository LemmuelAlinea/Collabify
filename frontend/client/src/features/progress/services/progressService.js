import { apiRequest } from '../../../services/api/client'

export async function getProgressDashboard() {
  const data = await apiRequest('/progress')
  return data.progress
}
