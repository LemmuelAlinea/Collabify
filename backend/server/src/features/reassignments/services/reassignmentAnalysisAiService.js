import { env } from '../../../config/env.js'

export async function generateReassignmentAnalysisAiInsight(payload) {
  if (!env.n8nReassignmentAnalysisWebhookUrl) return null

  const response = await fetch(env.n8nReassignmentAnalysisWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `
You are Collabify's Reassignment Request Adviser.
Return JSON only:
{
  "summary": "string",
  "verdict": "valid|valid_negative|questionable|needs_info",
  "suggestion": "string"
}
"valid" means the stated reason appears legitimate (e.g. illness/emergency).
"valid_negative" means the reason is a performance concern (e.g. not participating) and the data supports it.
"questionable" means the data does not support the stated reason.
"needs_info" means there isn't enough signal to judge confidently.
Do not approve or reject the request - only assess whether it appears valid.
Analyze this reassignment request payload:
${JSON.stringify(payload, null, 2)}
`,
      input: payload,
    }),
  })

  if (!response.ok) return null
  const data = await response.json().catch(() => ({}))
  return data.analysis ?? data
}
