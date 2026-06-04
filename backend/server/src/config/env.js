import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const missing = requiredEnv.filter((key) => !process.env[key])

if (missing.length > 0) {
  throw new Error(`Missing required server env: ${missing.join(', ')}`)
}

export const env = {
  apiBasePath: process.env.API_BASE_PATH ?? '/api/v1',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  n8nAnalyticsWebhookUrl: process.env.N8N_ANALYTICS_WEBHOOK_URL,
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET,
  n8nProjectValidationWebhookUrl: process.env.N8N_PROJECT_VALIDATION_WEBHOOK_URL,
  n8nTaskGenerationWebhookUrl: process.env.N8N_TASK_GENERATION_WEBHOOK_URL,
  n8nProjectHealthWebhookUrl: process.env.N8N_PROJECT_HEALTH_WEBHOOK_URL,
  port: Number(process.env.PORT ?? 3000),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  syllabiBucket: process.env.SUPABASE_STORAGE_BUCKET_SYLLABI ?? 'syllabi',
  curriculaBucket: process.env.SUPABASE_STORAGE_BUCKET_CURRICULA ?? 'curricula',
  projectFilesBucket: process.env.SUPABASE_PROJECT_FILES_BUCKET ?? 'project-files',
  announcementAttachmentsBucket: process.env.SUPABASE_ANNOUNCEMENT_ATTACHMENTS_BUCKET ?? 'announcement-attachments',
  submissionsBucket: process.env.SUPABASE_SUBMISSIONS_BUCKET ?? 'submissions',
}
