import { env } from '../../../config/env.js'

export async function generateHealthAiInsight(payload) {
  if (!env.n8nProjectHealthWebhookUrl) return null

  const response = await fetch(env.n8nProjectHealthWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `
You are Collabify Project Health Early Warning Adviser.
Return JSON only:
{
  "summary": "string",
  "warnings": [{"severity":"low|medium|high|critical","title":"string","description":"string"}],
  "recommendations": [{"priority":"low|medium|high|critical","title":"string","description":"string","actionType":"string"}],
  "forecast": {"trend":"improving|stable|declining","summary":"string"}
}
Analyze this project health payload:
${JSON.stringify(payload, null, 2)}
`,
      input: payload,
    }),
  })

  if (!response.ok) return null
  const data = await response.json().catch(() => ({}))
  return data.health ?? data
}
