# FounderOS Memory Engine

## What it is

The Memory Engine is FounderOS Layer 2 — the **historical memory layer**. While the Object Engine stores structured current reality (projects, tasks, goals), the Memory Engine stores **what happened over time**:

- Decisions made
- Insights captured
- Project and task updates
- Health logs
- Reflections and missions
- Object changes

Sprint 4 implements this as **local-first** storage (`founderos-memory-engine-v1`), structured for future Supabase migration.

## Why FounderOS needs memory

An AI operating system must remember context beyond the current state. Objects tell you *what exists now*; memories tell you *what changed, why, and when* — essential for reviews, reasoning, and trustworthy AI assistance.

## Objects vs Memories

| Object Engine | Memory Engine |
|---------------|---------------|
| Structured entities | Historical events |
| Current state | Timeline of changes |
| Relationships between things | Context about what happened |
| `/objects` | `/memory` |

Example: A **task object** exists in the Object Engine. When you complete it, a **task_update memory** records that event.

## Memory types

`event`, `decision`, `reflection`, `capture`, `object_change`, `project_update`, `task_update`, `health_log`, `learning`, `conversation`, `review`, `insight`

## How it connects to Object Engine

- Object create/update/delete → `object_change` or `insight` memories
- Relationship created → `insight` memory
- Memories link to objects via `relatedObjectIds`
- Seed memories reference seed object IDs

## Command Center integration

Automatic memories when you:

- Set today's mission → `reflection`
- Add/complete tasks → `task_update`
- Add projects → `project_update`
- Quick capture → `capture` or `decision`
- Save health snapshot → `health_log` (once per day)

Dedupe tags prevent spam from rapid edits.

## Future: Supabase migration

Planned table: `memory_records` with RLS per user. The React context API stays stable; only `memoryStorage.ts` swaps to Supabase queries.

## Future: Real AI reasoning

Memories will power:

- Reasoning Engine (Sprint 5+) — select relevant context
- Weekly/daily digests with OpenAI
- Vector search over memory content
- Goal conflict detection from decision history

## Known limitations

- localStorage only — not synced across devices
- No vector embeddings yet
- Assistant uses rule-based memory search, not LLM
- Object inline edits may still create occasional duplicate update memories (dedupe window: ~8s)
- Supabase Worlds/Goals not yet writing to Memory Engine
