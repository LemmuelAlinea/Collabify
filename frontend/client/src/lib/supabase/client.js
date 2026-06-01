import { createClient } from '@supabase/supabase-js'
import { assertClientEnv, env } from '../../config/env'

assertClientEnv()

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
})
