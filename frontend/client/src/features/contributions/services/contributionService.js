import { apiRequest } from '../../../services/api/client'

export async function getContributions() {
  const data = await apiRequest('/contributions')
  return data.contributions
}
