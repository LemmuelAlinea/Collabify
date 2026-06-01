import { supabase } from '../../../lib/supabase/client'

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
  users:user_id (
    id,
    email,
    role,
    is_active
  )
`

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCurrentUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function registerUser({
  email,
  password,
  role,
  firstName,
  lastName,
  studentNumber,
  employeeNumber,
  yearLevel,
  section,
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        first_name: firstName,
        last_name: lastName,
        student_number: studentNumber || null,
        employee_number: employeeNumber || null,
        year_level: yearLevel ? Number(yearLevel) : null,
        section: section || null,
      },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  })

  if (error) throw error
  return data
}

export async function loginUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function sendPasswordReset(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) throw error
  return data
}

export async function updatePassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) throw error
  return data
}

function parseHashParams() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  return new URLSearchParams(hash)
}

export async function establishRecoverySessionFromUrl() {
  const url = new URL(window.location.href)
  const query = url.searchParams
  const hash = parseHashParams()

  const tokenHash = query.get('token_hash')
  const queryType = query.get('type')
  if (tokenHash && queryType === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    })
    if (error) throw error
    window.history.replaceState({}, document.title, '/reset-password')
    return
  }

  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) throw error
    window.history.replaceState({}, document.title, '/reset-password')
  }
}
