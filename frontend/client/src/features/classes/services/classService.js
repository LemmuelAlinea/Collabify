import { apiRequest } from '../../../services/api/client'

export async function getMyClasses() {
  const data = await apiRequest('/classes/mine')
  return data.classes
}

export async function getProfessorClasses() {
  return getMyClasses()
}

export async function getClassDetails(classId) {
  return apiRequest(`/classes/${classId}`)
}

export async function createClass(payload) {
  const data = await apiRequest('/classes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.class
}

export async function updateClass(classId, payload) {
  const data = await apiRequest(`/classes/${classId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.class
}

export async function archiveClass(classId) {
  const data = await apiRequest(`/classes/${classId}`, {
    method: 'DELETE',
  })
  return data.class
}

export async function joinClass(classCode) {
  const data = await apiRequest('/classes/join', {
    method: 'POST',
    body: JSON.stringify({ classCode }),
  })
  return data.class
}

export async function assignClassSyllabus(classId, syllabusId) {
  return apiRequest(`/classes/${classId}/syllabus`, {
    method: 'PUT',
    body: JSON.stringify({ syllabusId }),
  })
}
