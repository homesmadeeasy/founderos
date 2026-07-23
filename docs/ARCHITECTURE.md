# FounderOS Architecture

Engineering source of truth for system shape. Implementation details live in code and feature docs; this document explains how the pieces fit.

---

## High-level system architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients (Browser)                        │
│  App Router pages · Feature components · Specialist UIs          │
└────────────┬───────────────────────────────┬────────────────────┘
             │ contexts / hooks              │ fetch
             ▼                               ▼
┌────────────────────────┐      ┌───────────────────────────────┐
│  React providers       │      │  Next.js API routes (/api/*)  │
│  engines + specialists │      │  requireAuth · OpenAI · env    │
└────────────┬───────────┘      └───────────────┬───────────────┘
             │                                  │
             │  publish(event)                  │ lib/db · embeddings
             ▼                                  ▼
┌────────────────────────┐      ┌───────────────────────────────┐
│  Founder Kernel        │      │  Supabase (Postgres + Auth)   │
│  bus · dispatch · hist │      │  RLS · gym_* · memory_* · …   │
└────────────┬───────────┘      └───────────────────────────────┘
             │
             ▼
┌────────────────────────┐      ┌───────────────────────────────┐
│  Engine subscribers    │      │  Local-first stores           │
│  memory · objects ·    │      │  founderos-*-v1 localStorage  │
│  cognitive · gym …     │      │  (engines + Gym primary)      │
└────────────────────────┘      └───────────────────────────────┘
```

**Two persistence worlds coexist today (intentional transition):**

1. **Classic product data** — projects, ideas, tasks, files via `lib/db/*` and `AppContext` → Supabase.
2. **Local-first engines / Gym** — versioned `localStorage` with optional Supabase sync through repositories.

New specialist work should follow the **Gym pattern**: domain types + repository interface + local impl + optional Supabase impl + context that never bypasses the repository.

---

## App layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Routes** | `app/(app)/`, `app/api/` | Auth shell, pages, server AI/data endpoints |
| **UI** | `components/<feature>/` | Presentation, accessibility, thin interaction |
| **Hooks** | `components/*/use*.ts`, feature hooks | Aggregate context → specialist input |
| **Contexts** | `contexts/` | React lifecycle, refresh, optimistic UX, kernel publish |
| **Domain / engines** | `lib/*-engine/`, `lib/specialists/`, `lib/ai/` | Pure(ish) business logic, scoring, snapshots |
| **Repositories** | e.g. `lib/specialists/gym/gymStorage/` | Persistence contract; local and/or Supabase |
| **DB helpers** | `lib/db/` | Supabase queries for classic product tables |
| **SQL** | `supabase/*.sql` | Schema + RLS (rerunnable, additive preferred) |
| **Docs** | `docs/` | Contracts, feature design, this handbook |

Root `app/layout.tsx` is fonts/styles only. Authenticated UX mounts in `app/(app)/layout.tsx`.

---

## Domain separation

| Domain | Code home | Notes |
|--------|-----------|--------|
| **Founder specialist** | `lib/specialists/founder/`, `components/founder/` | Deterministic advice + snapshot |
| **Gym specialist** | `lib/specialists/gym/`, `components/gym/`, `contexts/GymDataContext.tsx` | Reference specialist (full stack) |
| **Kernel** | `lib/founder-kernel/`, `contexts/FounderKernelContext.tsx` | Event bus only — no domain rules |
| **Memory Engine** | `lib/memory-engine/` | Historical Layer-2 records (local-first) |
| **Identity Engine** | `lib/identity/`, `contexts/IdentityContext.tsx` | Shared declared/observed user model for all specialists |
| **Vector memory** | `lib/memory/`, `supabase/vector_memory.sql` | Embeddings / semantic search (Supabase) |
| **Object / Knowledge / Executive** | `lib/*-engine/` | Structured reality, principles, priority |
| **Signals / Sync / Capture** | `lib/` + related contexts | Reality ingestion |
| **Cognitive model** | `lib/cognitive-model/` | World model consuming engines as evidence |
| **Domain intelligence** | `lib/domain-intelligence/` | Cross-domain lenses (not full specialists yet) |
| **Classic projects** | `lib/db/`, `AppContext`, `ProjectContext` | Projects/ideas/files product surface |

Do not merge Memory Engine and vector memory into one mental model — they solve different problems.

---

## Data flow

### Specialist path (preferred — Gym)

```
User action
  → Component (UI only)
  → GymDataContext / hook
  → Domain service (e.g. gymWorkoutService, engines)
  → GymRepository (local first)
  → optional cloud flush / pending queue
  → publish FounderEvent
  → subscribers update cognition / UI refresh
```

### Classic product path

```
User action
  → AppContext / ProjectContext
  → lib/db/* (Supabase client)
  → RLS-scoped rows
```

### AI path

```
Client requestFounderAI / feature fetch
  → POST /api/ai/* or /api/chat
  → requireAuth + env validation
  → OpenAI (or deterministic fallback)
  → typed response / proposals
  → engines remain source of truth; proposals need approval where applicable
```

**Rules:**

- Components do not embed SQL or open Supabase clients for specialist domains.
- Contexts may orchestrate repositories and kernel events; they should not become a second business-logic dump.
- Snapshots (`buildGymSnapshot`, `buildFounderSnapshot`) are pure views over inputs — good test seams.

---

## Kernel responsibilities

The Founder Kernel (`lib/founder-kernel/`) is the orchestration layer:

| Does | Does not |
|------|----------|
| Accept typed events | Score decisions |
| Queue and serially dispatch | Store domain entities as SOT |
| Match subscribers by event type + priority | Replace Redux/React Query |
| Isolate subscriber failures | Contain Gym/Founder rules |
| Record execution history | Call OpenAI |

**Publish flow:** `publish(input)` → build `FounderEvent` → enqueue → dispatch matching subscribers → archive history → notify React listeners.

Bootstrap: `components/kernel/KernelSubscriberBootstrap.tsx` registers engine subscribers (signals, objects, cognitive model, morning/evening, decisions, outcomes, etc.).

Detail: [founder-kernel-v1.md](./founder-kernel-v1.md)

---

## Memory system

### A. Memory Engine (Layer 2)

- `lib/memory-engine/` + `MemoryEngineContext`
- Local store `founderos-memory-engine-v1`
- Types: events, decisions, reflections, captures, health logs, …
- Search: in-memory filters/substring
- Writes often publish `MemoryCreated`

### B. Vector / semantic memory

- `lib/memory/` + `app/api/memory/*`
- `supabase/vector_memory.sql` (`memory_embeddings`, match RPC)
- OpenAI embeddings; RLS-scoped

Specialists (e.g. Gym finish workout) should record meaningful Memory Engine entries when the user completes durable life events. Semantic indexing is complementary, not a replacement.

---

## Repository pattern

**Contract:** storage-agnostic TypeScript interface (see `GymRepository`).

**Implementations:**

| Impl | Role |
|------|------|
| `LocalGymRepository` | Primary offline/dev store wrapping versioned local blob |
| `SupabaseGymRepository` | Authenticated cloud via anon key + RLS |
| Factory + pending sync | Local write first; queue idempotent cloud ops; flush on `online` |

**Expectations for future specialists:**

1. Define domain types once.
2. Define `XRepository` interface.
3. Implement local (required) and Supabase (when schema exists).
4. Context talks only to repository/factory — not raw `createClient()` in components.
5. Migrations live in `supabase/*.sql` and stay RLS-safe and rerunnable.

Classic `lib/db/*` remains valid for project/idea tables until those domains are also repository-wrapped.

---

## AI architecture

| Piece | Role |
|-------|------|
| `lib/specialists/*` | Deterministic domain intelligence |
| `lib/ai/founder/` | Founder AI v2 service, schemas, proposals |
| `app/api/ai/founder` | Authenticated LLM endpoint + fallback |
| `app/api/chat` | Project-scoped chat |
| Feature APIs | reviews, DNA, extraction, pattern analysis, … |
| Evaluation | `lib/evaluation/`, docs under `founder-ai-evaluation-v1.md` |

**Principles:**

- Server-only API keys (`lib/ai/server.ts`, `lib/env`).
- Prefer structured outputs (Zod) over free-form mutation.
- LLMs propose; engines and repositories commit.
- Rate limit and fail closed to deterministic behaviour when possible.

---

## Supabase architecture

| Concern | Pattern |
|---------|---------|
| Browser client | `lib/supabase/client.ts` — anon key |
| Server client | `lib/supabase/server.ts` — cookie session |
| Session refresh / route gate | `lib/supabase/middleware.ts` via `proxy.ts` |
| Protected prefixes | `lib/supabase/protectedRoutes.ts` |
| Auth on AI routes | `lib/api/auth.ts` `requireAuth` |
| Schema | `supabase/*.sql` — see `supabase/README.md` |
| Security | RLS with `auth.uid()`; **no service-role key in the app** |

Gym tables (`gym.sql`) use parent-scoped RLS for child performances/sets.

Staging notes: [private-staging-deployment.md](./private-staging-deployment.md)

---

## Event flow

```
Reality / UI / Sync
       │
       ▼
 publish({ type, source, payload })
       │
       ▼
 Founder Kernel Bus
       │
       ├─► Signal / Object / Memory subscribers
       ├─► Cognitive model refresh
       ├─► Decision / Outcome / Domain intelligence
       ├─► Morning / Evening loops
       └─► Specialist-adjacent listeners (via history or future subscribers)
```

Gym examples: `WorkoutStarted`, `SetLogged`, `WorkoutCompleted`, `WorkoutLogged`, `ExercisePR`, `WeeklyVolumeUpdated`, `RecoveryUpdated` (exertion inputs — not medical claims).

Event names are PascalCase verbs. Payloads stay JSON-serialisable and minimal.

---

## Provider nesting (authenticated shell)

Approximate order in `app/(app)/layout.tsx` (outer → inner):

`AppProvider` → Memory → Object → Knowledge → Executive → Signal → Sync → UniversalCapture → **FounderKernel** → Morning → Evening → CognitiveModel → ActionEngine → Conversation → CommandBar → KernelSubscriberBootstrap + chrome.

**Mounted elsewhere:**

- `GymDataProvider` — `app/(app)/gym/layout.tsx`
- `ProjectProvider` — project detail layout
- Command center provider — home page local

When adding providers, keep the graph acyclic. Provider dependency tests live under `lib/contexts/providerTests.ts`.

---

## Related reading

- [VISION.md](./VISION.md)
- [DOMAIN_FRAMEWORK.md](./DOMAIN_FRAMEWORK.md)
- [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- Feature docs: kernel, cognitive model, gym, founder AI (see [README.md](./README.md))
