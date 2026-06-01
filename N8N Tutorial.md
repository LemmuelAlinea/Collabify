# N8N Tutorial

## Goal

Create an n8n workflow that receives Collabify project data, sends it to OpenAI, and returns a strict JSON validation report to the backend.

## Required Credentials

- OpenAI API key
- n8n instance URL
- Collabify backend `.env`

```env
N8N_PROJECT_VALIDATION_WEBHOOK_URL=https://your-n8n-domain/webhook/collabify/project-validation
```

## Workflow Nodes

1. Webhook
2. Code
3. OpenAI Chat Model
4. Code
5. Respond to Webhook

## Step 1: Create Webhook

Create a new workflow.

Add `Webhook` node:

```txt
HTTP Method: POST
Path: collabify/project-validation
Response Mode: Using "Respond to Webhook" node
```

Expected body:

```json
{
  "prompt": "AI prompt from Collabify backend",
  "input": {
    "project": {},
    "class": {},
    "syllabus": [],
    "historicalData": [],
    "similarProjects": []
  }
}
```

## Step 2: Normalize Input

Add `Code` node named `Prepare AI Payload`.

```js
const body = $input.first().json.body ?? $input.first().json;

return [{
  json: {
    prompt: body.prompt,
    input: body.input,
  },
}];
```

## Step 3: Add OpenAI Node

Add `OpenAI` node.

Use:

```txt
Resource: Chat
Operation: Message a Model
Model: gpt-4.1-mini
```

System message:

```txt
You are Collabify Academic Project Adviser Assistant for BSIT programs.
You analyze academic projects before professor release.
You never approve or reject projects.
The professor always makes the final decision.
Return valid JSON only.
```

User message:

```txt
{{$json.prompt}}
```

Temperature:

```txt
0.2
```

Response format:

```txt
JSON
```

## Step 4: Parse OpenAI JSON

Add `Code` node named `Parse Validation`.

```js
const raw =
  $input.first().json.message?.content ??
  $input.first().json.text ??
  $input.first().json.output ??
  $input.first().json;

const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

const requiredScores = [
  'curriculum_alignment',
  'year_level_appropriateness',
  'scope_realism',
  'timeline_feasibility',
  'team_size_suitability',
  'workload_balance',
  'skill_coverage',
  'learning_outcome_prediction',
  'rubric_quality',
  'project_type_fit',
];

const scores = requiredScores.map((category) => {
  const existing = parsed.scores?.find((score) => score.category === category);
  return existing ?? {
    category,
    score: 0,
    label: 'Needs Review',
    explanation: 'AI did not provide this score.',
  };
});

return [{
  json: {
    validation: {
      executiveSummary: parsed.executiveSummary ?? '',
      readinessScore: Number(parsed.readinessScore ?? 0),
      readinessLabel: parsed.readinessLabel ?? 'Needs Revision',
      difficultyScore: Number(parsed.difficultyScore ?? 0),
      difficultyLabel: parsed.difficultyLabel ?? 'Intermediate',
      scores,
      risks: parsed.risks ?? [],
      recommendations: parsed.recommendations ?? [],
      skillCoverage: parsed.skillCoverage ?? [],
      coveredOutcomes: parsed.coveredOutcomes ?? [],
      missingOutcomes: parsed.missingOutcomes ?? [],
      comparisonReport: parsed.comparisonReport ?? '',
      validationReport: parsed.validationReport ?? {},
    },
  },
}];
```

## Step 5: Respond to Collabify

Add `Respond to Webhook` node.

```txt
Response Code: 200
Response Body: First incoming item JSON
```

The response must look like:

```json
{
  "validation": {
    "executiveSummary": "string",
    "readinessScore": 85,
    "readinessLabel": "Ready with Minor Improvements",
    "difficultyScore": 70,
    "difficultyLabel": "Advanced",
    "scores": [],
    "risks": [],
    "recommendations": [],
    "skillCoverage": [],
    "coveredOutcomes": [],
    "missingOutcomes": [],
    "comparisonReport": "string",
    "validationReport": {}
  }
}
```

## Step 6: Activate Workflow

Save workflow.

Activate it.

Copy production webhook URL into:

```env
N8N_PROJECT_VALIDATION_WEBHOOK_URL=
```

Restart backend:

```bash
npm run dev
```

## Step 7: Test From Collabify

Go to:

```txt
Professor > Projects > Analyze
```

Click:

```txt
Analyze Project
```

Expected result:

- Readiness score
- Difficulty score
- Curriculum alignment score
- Timeline risks
- Scope risks
- Recommendations
- Validation history

## OpenAI JSON Contract

The workflow must always return:

```json
{
  "validation": {
    "executiveSummary": "",
    "readinessScore": 0,
    "readinessLabel": "",
    "difficultyScore": 0,
    "difficultyLabel": "",
    "scores": [
      {
        "category": "",
        "score": 0,
        "label": "",
        "explanation": ""
      }
    ],
    "risks": [
      {
        "riskType": "",
        "severity": "low",
        "probability": 0,
        "reason": "",
        "mitigation": ""
      }
    ],
    "recommendations": [
      {
        "priority": "medium",
        "title": "",
        "description": "",
        "actionType": ""
      }
    ],
    "skillCoverage": [],
    "coveredOutcomes": [],
    "missingOutcomes": [],
    "comparisonReport": "",
    "validationReport": {
      "curriculumAlignment": "",
      "yearLevelSuitability": "",
      "scopeAnalysis": "",
      "timelineAnalysis": "",
      "teamAnalysis": "",
      "skillCoverage": "",
      "learningOutcomePrediction": "",
      "riskAssessment": "",
      "recommendations": ""
    }
  }
}
```
