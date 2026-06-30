# FounderOS — Developer Guide

## Architecture overview

FounderOS is a Next.js App Router application with:

- **Client state:** `AppContext` loads all user data from Supabase on mount and keeps the UI responsive with optimistic updates.
- **Project state:** `ProjectContext` wraps a single project for chat, reviews and DNA.
- **Server AI routes:** `/app/api/*` call OpenAI with concise context; API keys never reach the browser.
- **Database layer:** `lib/db/` — domain-organised Supabase queries with RLS.

```
Browser → AppContext (Supabase client) → lib/db/*
Browser → /api/chat → lib/ai/server → OpenAI
Server  → createClient() → lib/db/* → Supabase (RLS)
```

## Folder structure

| Path | Purpose |
|------|---------|
| `app/(app)/` | Authenticated app shell (dashboard, projects, ideas, etc.) |
| `app/api/` | Server-only API routes |
| `components/` | UI components by feature |
| `contexts/` | React providers |
| `lib/db/` | Supabase data access (split by domain) |
| `lib/ai/` | AI helpers (`server.ts`, `json.ts`, `prompts.ts`) |
| `lib/api/` | Shared API auth + validation |
| `lib/types.ts` | Shared TypeScript domain types |
| `supabase/` | SQL migrations |

## Core concepts

| Concept | Description |
|---------|-------------|
| **Idea Vault** | Raw ideas before they become projects |
| **Project** | Execution unit with chat, tasks, reviews, files |
| **Structured objects** | Tasks, notes, decisions, risks, roadmap items |
| **Memory graph** | Links between entities (`lib/links.ts`) |
| **Project DNA** | Long-term project identity profile |
| **Pattern analysis** | Cross-project behavioural insights |

## Database tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile + onboarding flags |
| `projects` | Projects |
| `tasks`, `notes`, `decisions`, `risks`, `roadmap_items` | Structured project objects |
| `messages` | Project chat history |
| `ideas`, `idea_analyses` | Idea Vault |
| `links` | Knowledge graph |
| `project_files` | Uploaded files |
| `project_reviews` | AI project reviews |
| `weekly_reviews` | Global weekly reviews |
| `project_dna` | Project DNA profiles |
| `pattern_analyses` | Cross-project patterns |

All tables use Row Level Security scoped to `auth.uid()`.

## Main AI routes

| Route | Purpose |
|-------|---------|
| `POST /api/chat` | Project chat (auth required) |
| `POST /api/extract-object` | Convert chat text to structured object |
| `POST /api/project-review` | Generate project review |
| `POST /api/weekly-review` | Generate weekly review |
| `POST /api/project-dna` | Generate Project DNA |
| `POST /api/pattern-analysis` | Cross-project pattern analysis |
| `POST /api/idea-analysis` | Analyse an idea |
| `POST /api/file-summary` | Summarise uploaded file |

Shared OpenAI setup: `lib/ai/server.ts`  
Shared JSON parsing: `lib/ai/json.ts`  
Env validation: `lib/env.ts`

## Core user flows

1. **Capture** — Idea Vault
2. **Organise** — Analyse idea, convert to project
3. **Plan** — Project chat + extraction
4. **Execute** — Tasks, roadmap, decisions
5. **Review** — Project review + weekly review
6. **Improve** — Project DNA + pattern detection

## Adding a new feature safely

1. Add SQL migration in `supabase/` with RLS policies
2. Add types to `lib/types.ts`
3. Add db helpers in `lib/db/<domain>.ts` and export from `lib/db/index.ts`
4. If AI-powered: add prompt + normalizer in `lib/<feature>.ts`, use `runJsonCompletion`
5. Add API route with `requireAuth()` + input validation
6. Add UI page/component; use `EmptyState`, `LoadingScreen`, `ErrorState`
7. Run `npm run lint && npm run build`

## Pre-commit checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] No secrets in client code
- [ ] New API routes require auth where appropriate
- [ ] RLS policies added for new tables
- [ ] Manual smoke test of affected flows
