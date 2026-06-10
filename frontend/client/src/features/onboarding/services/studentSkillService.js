import { apiRequest } from '../../../services/api/client'

export async function getOwnSkillSet() {
  const data = await apiRequest('/student-skills/me')
  return data.skills
}

export async function saveOwnSkillSet(skills) {
  const data = await apiRequest('/student-skills/me', {
    method: 'PUT',
    body: JSON.stringify({ skills }),
  })

  return data.skills
}
