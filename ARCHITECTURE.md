# Collabify Project Architecture

Collabify uses a feature-based split between a Vite React client and an Express API server. Shared concerns live in top-level infrastructure folders, while each product module owns its UI, API routes, services, hooks, and tests.

## Workspace

```text
Collabify/
├── ARCHITECTURE.md
├── .env.example
├── backend/
│   └── server/
│       ├── .env.example
│       ├── package.json
│       ├── README.md
│       ├── docs/
│       ├── src/
│       │   ├── app.js
│       │   ├── server.js
│       │   ├── config/
│       │   ├── core/
│       │   │   ├── constants/
│       │   │   ├── errors/
│       │   │   ├── http/
│       │   │   ├── middleware/
│       │   │   └── utils/
│       │   ├── db/
│       │   │   ├── migrations/
│       │   │   ├── seeds/
│       │   │   └── supabase/
│       │   ├── features/
│       │   ├── integrations/
│       │   │   ├── n8n/
│       │   │   ├── openai/
│       │   │   └── supabase/
│       │   ├── realtime/
│       │   ├── storage/
│       │   └── validators/
│       └── tests/
│           ├── integration/
│           └── unit/
└── frontend/
    └── client/
        ├── .env.example
        ├── public/
        ├── src/
        │   ├── app/
        │   │   ├── layouts/
        │   │   ├── providers/
        │   │   └── router/
        │   ├── assets/
        │   │   ├── images/
        │   │   └── styles/
        │   ├── components/
        │   │   ├── common/
        │   │   ├── forms/
        │   │   ├── layout/
        │   │   ├── navigation/
        │   │   └── ui/
        │   ├── config/
        │   ├── constants/
        │   ├── features/
        │   ├── hooks/
        │   ├── lib/
        │   │   ├── realtime/
        │   │   ├── storage/
        │   │   └── supabase/
        │   ├── services/
        │   │   ├── api/
        │   │   ├── n8n/
        │   │   └── openai/
        │   ├── store/
        │   ├── utils/
        │   └── validators/
        └── tests/
            ├── components/
            ├── e2e/
            └── unit/
```

## Feature Modules

Each feature follows the same ownership pattern.

Frontend:

```text
src/features/<feature>/
├── components/
├── hooks/
├── pages/
└── services/
```

Backend:

```text
src/features/<feature>/
├── controllers/
├── routes/
└── services/
```

Current product features:

- `auth`
- `profiles`
- `syllabus`
- `classes`
- `projects`
- `groups`
- `tasks`
- `subtasks`
- `submissions`
- `messages`
- `contributions`
- `reassignments`
- `analytics`
- `ai-validation`
- `ai-task-generation`
- `project-health`

## Architectural Boundaries

- `frontend/client/src/app`: application shell, providers, routing, layouts.
- `frontend/client/src/components`: reusable cross-feature components only.
- `frontend/client/src/features`: feature-owned UI, hooks, pages, and client services.
- `frontend/client/src/services`: API client layer and external service adapters.
- `frontend/client/src/lib`: configured clients for Supabase Auth, Realtime, and Storage.
- `backend/server/src/core`: shared API primitives, middleware, errors, constants, and utilities.
- `backend/server/src/features`: route/controller/service modules for product behavior.
- `backend/server/src/integrations`: external adapters for Supabase, n8n, and OpenAI.
- `backend/server/src/db`: database migrations, seeds, and Supabase database helpers.
- `backend/server/src/realtime`: server-side realtime event orchestration.
- `backend/server/src/storage`: server-side storage policies and upload helpers.

## Environment Strategy

- Root `.env.example` documents shared workspace variables.
- `frontend/client/.env.example` uses Vite-safe `VITE_` variables only.
- `backend/server/.env.example` contains server-only secrets such as Supabase service-role keys, OpenAI keys, and n8n webhook secrets.
- Production secrets should be configured in the deployment platform, not committed.
