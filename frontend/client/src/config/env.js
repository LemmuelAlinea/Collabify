const requiredEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
}

function normalizeApiBaseUrl(value) {
  const fallback = 'http://localhost:3000/api/v1'
  const base = String(value ?? fallback).trim().replace(/\/+$/, '')
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`
}

export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? 'Collabify',
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  profileAssetsBucket: import.meta.env.VITE_SUPABASE_PROFILE_ASSETS_BUCKET ?? 'profile-assets',
  syllabiBucket: import.meta.env.VITE_SUPABASE_SYLLABI_BUCKET ?? 'syllabi',
  curriculaBucket: import.meta.env.VITE_SUPABASE_CURRICULA_BUCKET ?? 'curricula',
  submissionsBucket: import.meta.env.VITE_SUPABASE_SUBMISSIONS_BUCKET ?? 'submissions',
  messageAttachmentsBucket: import.meta.env.VITE_SUPABASE_MESSAGE_ATTACHMENTS_BUCKET ?? 'message-attachments',
  announcementAttachmentsBucket: import.meta.env.VITE_SUPABASE_ANNOUNCEMENT_ATTACHMENTS_BUCKET ?? 'announcement-attachments',
  ...requiredEnv,
}

export function assertClientEnv() {
  const missing = Object.entries(requiredEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing required client env: ${missing.join(', ')}`)
  }
}
