import { env } from '../../../config/env.js'

export async function generateAnalyticsInsight(payload) {
  if (!env.n8nAnalyticsWebhookUrl) return null

  const response = await fetch(env.n8nAnalyticsWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) return null
  const data = await response.json().catch(() => ({}))
  return data.insight ?? data.text ?? data.message ?? null
}
