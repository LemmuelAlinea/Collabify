import { env } from '../../config/env'
import { supabase } from '../../lib/supabase/client'

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session?.access_token
}

export async function apiRequest(path, options = {}) {
  const token = await getAccessToken()
  const headers = new Headers(options.headers)
  const controller = new AbortController()
  const timeoutMs = 45000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Try shortening the description or retrying.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error?.details ?? payload.error?.message ?? 'Request failed')
  }

  return payload
}
