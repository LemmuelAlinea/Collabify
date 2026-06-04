import { apiRequest } from '../../../services/api/client'

export async function getProgressDashboard() {
  const data = await apiRequest('/progress')
  return data.progress
}

export async function getProgressTimeline() {
  const data = await apiRequest('/progress/timeline')
  return data.timeline
}
