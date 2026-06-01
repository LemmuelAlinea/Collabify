import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import { env } from '../../config/env.js'

const supabaseNodeOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: WebSocket,
  },
}

export const supabaseAuthClient = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  supabaseNodeOptions,
)

export const supabaseAdminClient = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  supabaseNodeOptions,
)
