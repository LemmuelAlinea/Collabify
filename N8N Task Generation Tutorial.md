# N8N Task Generation Tutorial

## Environment

```env
N8N_TASK_GENERATION_WEBHOOK_URL=https://your-n8n-domain/webhook/collabify/task-generation
```

## Workflow

```txt
Webhook -> Code -> OpenAI -> Code -> Respond to Webhook
```

## Webhook

```txt
Method: POST
Path: collabify/task-generation
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
You are Collabify AI Academic Project Planner, Technical Lead, Scrum Master, and Project Adviser for BSIT programs.
Return valid JSON only.
Tasks must be specific, measurable, actionable, trackable, and assignable.
Total task/subtask weights must equal 100.
```

User:

```txt
You are Collabify AI Academic Project Planner, Technical Lead, Scrum Master, and Project Adviser for BSIT programs.
Return valid JSON only.
Tasks must be specific, measurable, actionable, trackable, and assignable.
Total task/subtask weights must equal 100.
```

## Code: Validate Response

```js
const raw =
  $input.first().json.message?.content ??
  $input.first().json.text ??
  $input.first().json.output ??
  $input.first().json;

const plan = typeof raw === 'string' ? JSON.parse(raw) : raw;

const tasks = plan.tasks ?? [];
const weightedItems = tasks.flatMap((task) => task.subtasks?.length ? task.subtasks : [task]);
const total = weightedItems.reduce((sum, task) => sum + Number(task.weight || task.points || 1), 0) || 1;
let used = 0;

weightedItems.forEach((task, index) => {
  task.weight = index === weightedItems.length - 1
    ? Math.round((100 - used) * 100) / 100
    : Math.round((Number(task.weight || task.points || 1) / total) * 10000) / 100;
  used += task.weight;
});

return [{
  json: {
    plan: {
      projectSummary: plan.projectSummary ?? '',
      complexityScore: Number(plan.complexityScore ?? 0),
      complexityLabel: plan.complexityLabel ?? 'Moderate',
      structureType: plan.structureType ?? 'hierarchical',
      tasks,
      milestones: plan.milestones ?? [],
      workloadAnalysis: plan.workloadAnalysis ?? {
        teamSize: 1,
        totalEstimatedHours: 0,
        balanceScore: 0,
        contributionPlan: [],
        roleSuggestions: [],
        warnings: [],
      },
      report: plan.report ?? {},
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
  "plan": {
    "projectSummary": "",
    "complexityScore": 0,
    "complexityLabel": "Moderate",
    "structureType": "hierarchical",
    "tasks": [],
    "milestones": [],
    "workloadAnalysis": {
      "teamSize": 1,
      "totalEstimatedHours": 0,
      "balanceScore": 0,
      "contributionPlan": [],
      "roleSuggestions": [],
      "warnings": []
    },
    "report": {}
  }
}
```
