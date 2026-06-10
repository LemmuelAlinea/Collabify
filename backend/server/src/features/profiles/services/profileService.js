import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { HttpError } from '../../../core/errors/httpError.js'

const PROFILE_SELECT = `
  id,
  user_id,
  student_number,
  employee_number,
  first_name,
  middle_name,
  last_name,
  display_name,
  avatar_url,
  program,
  department,
  year_level,
  section,
  subject_specialization,
  bio,
  metadata,
  skills_onboarding_done,
  created_at,
  updated_at,
  users:user_id (
    id,
    email,
    role,
    is_active
  )
`

function normalizeProfile(profile) {
  const fullName = [
    profile.first_name,
    profile.middle_name,
    profile.last_name,
  ].filter(Boolean).join(' ')

  return {
    id: profile.id,
    userId: profile.user_id,
    email: profile.users.email,
    role: profile.users.role,
    isActive: profile.users.is_active,
    firstName: profile.first_name,
    middleName: profile.middle_name,
    lastName: profile.last_name,
    fullName,
    avatarUrl: profile.avatar_url,
    studentNumber: profile.student_number,
    employeeNumber: profile.employee_number,
    program: profile.program,
    department: profile.department,
    yearLevel: profile.year_level,
    section: profile.section,
    subjectSpecialization: profile.subject_specialization,
    bio: profile.bio,
    metadata: profile.metadata,
    skillsOnboardingDone: profile.skills_onboarding_done,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  }
}

export async function getProfileByUserId(userId) {
  const { data, error } = await supabaseAdminClient
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new HttpError(404, 'Profile not found')
  }

  return normalizeProfile(data)
}

export async function updateProfile(userId, payload, role) {
  const updatePayload = {
    first_name: payload.firstName,
    middle_name: payload.middleName,
    last_name: payload.lastName,
    avatar_url: payload.avatarUrl,
    department: payload.department,
    bio: payload.bio,
  }

  if (role === 'student') {
    updatePayload.year_level = payload.yearLevel
    updatePayload.section = payload.section
    updatePayload.subject_specialization = null
  }

  if (role === 'professor') {
    updatePayload.subject_specialization = payload.subjectSpecialization
    updatePayload.year_level = null
    updatePayload.section = null
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key]
    }
  })

  const { error } = await supabaseAdminClient
    .from('profiles')
    .update(updatePayload)
    .eq('user_id', userId)

  if (error) {
    throw new HttpError(400, 'Unable to update profile', error.message)
  }

  if (payload.newPassword) {
    const { error: passwordError } = await supabaseAdminClient.auth.admin.updateUserById(userId, {
      password: payload.newPassword,
    })

    if (passwordError) {
      throw new HttpError(400, 'Unable to update password', passwordError.message)
    }
  }

  return getProfileByUserId(userId)
}
