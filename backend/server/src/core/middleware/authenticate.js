import { HttpError } from '../errors/httpError.js'
import { supabaseAdminClient, supabaseAuthClient } from '../../integrations/supabase/client.js'

function getBearerToken(req) {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim()
}

export async function authenticate(req, _res, next) {
  try {
    const token = getBearerToken(req)

    if (!token) {
      throw new HttpError(401, 'Missing bearer token')
    }

    const { data, error } = await supabaseAuthClient.auth.getUser(token)

    if (error || !data.user) {
      throw new HttpError(401, 'Invalid or expired session')
    }

    const { data: profile, error: profileError } = await supabaseAdminClient
      .from('profiles')
      .select(`
        id,
        user_id,
        first_name,
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
      `)
      .eq('user_id', data.user.id)
      .single()

    if (profileError || !profile?.users?.is_active) {
      throw new HttpError(403, 'Account is not active or profile is missing')
    }

    req.auth = {
      token,
      user: data.user,
      appUser: profile.users,
      profile,
      role: profile.users.role,
    }

    next()
  } catch (error) {
    next(error)
  }
}
