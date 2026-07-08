# FounderOS Object Engine

## What it is

The Object Engine is FounderOS's internal memory layer. Every meaningful entity in the system — projects, tasks, goals, habits, ideas, decisions, and more — is represented as a **FounderObject** with typed relationships between them.

Sprint 3 implements this as a **local-first** system using `localStorage` (`founderos-object-engine-v1`). The structure is designed for a future migration to Supabase/Postgres without rewriting the application layer.

## Why object-first?

FounderOS is evolving from a productivity dashboard into an **AI operating system**. Chatbots answer questions; an OS **remembers, connects, and reasons** over structured entities.

An object-first architecture means:

- Every piece of knowledge has a stable identity (`id`, `type`, `title`)
- Relationships express meaning (`supports`, `blocks`, `belongs_to`, etc.)
- AI can traverse the graph instead of parsing unstructured text
- Command Center, Worlds, Goals, and Idea Vault can converge on one model over time

## Core object types

| Type | Purpose |
|------|---------|
| `project` | Execution container |
| `task` | Action item |
| `goal` | Outcome to achieve |
| `habit` | Recurring behaviour |
| `idea` | Raw or validated concept |
| `note` | Free-form knowledge |
| `decision` | Committed choice |
| `workout`, `meal` | Health tracking |
| `book`, `document` | Knowledge assets |
| `person`, `event` | Life context |
| `review`, `conversation` | Reflection and dialogue |
| `capture` | Inbox item (incl. questions) |

## Relationship types

Relationships connect objects directionally:

- **supports** — A helps B succeed
- **belongs_to** — A is part of B
- **blocks** / **conflicts_with** — Tension or dependency
- **related_to** — Loose association
- **created_from** — Provenance
- And more: `depends_on`, `part_of`, `follows`, `references`, `improves`

## Current implementation (Sprint 3)

```
lib/object-engine/
  objectTypes.ts       — Types and labels
  objectSchemas.ts     — Per-type defaults
  objectStorage.ts     — localStorage CRUD
  objectRelationships.ts — Graph helpers
  objectSearch.ts      — Filter and search
  objectSummaries.ts   — Plain-English summaries
  objectSeedData.ts    — Seed objects + relationships
  commandCenterBridge.ts — Sync from Command Center
```

**UI:** `/objects` — browse, filter, search, edit, link objects.

**Integration:** Creating tasks, projects, or quick captures in the Command Center also creates matching FounderObjects (same ID).

**Assistant:** Rule-based responses can query objects and relationships (e.g. "What supports my model physique goal?").

## Future: Supabase migration

Planned tables:

- `founder_objects` — one row per object
- `object_relationships` — edges between objects
- RLS scoped to `user_id`

Migration path:

1. Add Supabase tables mirroring current TypeScript types
2. Replace `objectStorage.ts` calls with `lib/db/objects.ts`
3. Keep `ObjectEngineContext` API unchanged
4. Backfill from localStorage on first login (one-time import)

## Future: Real AI reasoning

Once objects live in Supabase:

- Vector embeddings per object (extend existing `memory_embeddings`)
- AI reviews traverse relationships for goal conflict detection
- Weekly Review and Goal Review pull from Object Engine instead of ad-hoc queries
- Command Center assistant replaced with OpenAI calls that receive object subgraphs as context

The Object Engine is the foundation. Sprint 4+ will unify Worlds, Goals, and Supabase data into this model.
