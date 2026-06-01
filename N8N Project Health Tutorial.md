# N8N Project Health Tutorial

```env
N8N_PROJECT_HEALTH_WEBHOOK_URL=https://your-n8n-domain/webhook/collabify/project-health
```

## Workflow

```txt
Webhook -> Code -> OpenAI -> Code -> Respond to Webhook
```

## Webhook

```txt
Method: POST
Path: collabify/project-health
Response: Respond to Webhook node
```

## Code: Prepare Payload

```js
const body = $input.first().json.body ?? $input.first().json;

return [{
  json: {
    prompt: body.prompt,
    input: body.input,
  },
}];
```

## OpenAI

```txt
Model: gpt-4.1-mini
Temperature: 0.2
Response Format: JSON
```

System:

```txt
You are Collabify Project Health Early Warning Adviser for BSIT academic projects.
Return valid JSON only.
Detect delays, inactivity, contribution imbalance, workload imbalance, deadline risks, task risks, group risks, and timeline risks.
Do not make final academic decisions.
```

User:

```txt
You are Collabify Project Health Early Warning Adviser for BSIT academic projects.
Return valid JSON only.
Detect delays, inactivity, contribution imbalance, workload imbalance, deadline risks, task risks, group risks, and timeline risks.
Do not make final academic decisions.
```

## Code: Normalize Response

```js
const raw =
  $input.first().json.message?.content ??
  $input.first().json.text ??
  $input.first().json.output ??
  $input.first().json;

const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

return [{
  json: {
    health: {
      summary: parsed.summary ?? '',
      warnings: parsed.warnings ?? [],
      recommendations: parsed.recommendations ?? [],
      forecast: parsed.forecast ?? {
        trend: 'stable',
        summary: '',
      },
    },
  },
}];
```

## Respond to Webhook

```txt
Status: 200
Body: First item JSON
```

## Expected Response

```json
{
  "health": {
    "summary": "Project remains healthy but contribution imbalance is increasing.",
    "warnings": [
      {
        "severity": "high",
        "title": "Uneven Contribution",
        "description": "One member owns most of the completed work."
      }
    ],
    "recommendations": [
      {
        "priority": "high",
        "title": "Redistribute Workload",
        "description": "Assign pending tasks to underloaded members.",
        "actionType": "redistribute_work"
      }
    ],
    "forecast": {
      "trend": "declining",
      "summary": "Deadline risk is increasing."
    }
  }
}
```
