# Collabify API

Express API server for Collabify.

## Structure

- `src/app.js`: Express app composition.
- `src/server.js`: HTTP server entrypoint.
- `src/config`: environment and runtime configuration.
- `src/core`: shared middleware, errors, HTTP helpers, constants, and utilities.
- `src/db`: Supabase PostgreSQL migrations, seeds, and database helpers.
- `src/features`: feature-owned controllers, routes, and services.
- `src/integrations`: Supabase, n8n, and OpenAI adapters.
- `src/realtime`: Supabase Realtime orchestration.
- `src/storage`: Supabase Storage helpers.
- `src/validators`: shared request validation schemas.

## Features

`auth`, `profiles`, `syllabus`, `classes`, `projects`, `groups`, `tasks`, `subtasks`, `submissions`, `messages`, `contributions`, `reassignments`, `analytics`, `ai-validation`, `ai-task-generation`, and `project-health`.

