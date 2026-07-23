# Domain Framework — Specialist AI Blueprint

Every future specialist AI in FounderOS must follow this architecture. **Gym AI is the reference implementation.** Founder AI is a second specialist with a thinner persistence layer today; new work should match Gym’s completeness, not Founder’s historical shortcuts.

This document is the contract for multi-engineer delivery.

---

## Purpose

Specialists own deep domain expertise (training, founder execution, school, finance, …). They must:

- Persist durable user data safely
- Produce explainable recommendations
- Integrate with Memory and the Founder Kernel
- Expose a coherent UI surface
- Ship with tests and docs

They must **not** become a parallel app with shadow types, direct DB calls from components, or unreproducible LLM-only behaviour.

---

## Required building blocks

Every specialist `X` should eventually provide all of the following:

| Building block | Responsibility | Gym reference |
|----------------|----------------|---------------|
| **Data** | Profiles, entities, sessions, plans — versioned domain model | `gymStorageTypes.ts`, `gymTypes.ts` |
| **Memory** | Record meaningful life/domain events into Memory Engine (and index when relevant) | Workout complete → `recordMemory` + kernel events |
| **Conversation** | Domain chat / Q&A over specialist context | `gymConversation.ts`, `GymConversationCard.tsx` |
| **Recommendations** | Bounded, evidence-backed next actions | Evidence + progression + `adviseNextSet` / prescriptions |
| **History** | Past sessions/entities the user can inspect | `/gym/history`, session records |
| **Insights** | Aggregations: volume, weakness, trends, adherence | Muscle volume, recovery cards, PR detection |
| **Settings** | Profile / preferences / tracking mode | `GymProfileEditor`, onboarding |
| **Repository** | Storage-agnostic I/O: local + (optional) Supabase | `GymRepository`, local + supabase + factory |
| **Components** | UI under `components/<specialist>/` | `components/gym/*` |
| **Types** | Shared TS types; no duplicate models in UI | `gymTypes` + `gymStorageTypes` |
| **Tests** | Domain + persistence + schema shape as applicable | `test:gym-*` scripts |

Optional but recommended:

| Block | Notes |
|-------|--------|
| **Snapshot** | Pure `buildXSnapshot(input)` for UI and evals |
| **Input builder** | `buildXInput` / `useXInput` composing base + cognitive |
| **Evidence / research** | When claims need citations (Gym evidence layer) |
| **Active / live mode** | Real-time logging UX (Active Workout Engine) |
| **SQL + RLS** | `supabase/<domain>.sql` when cloud durability is required |
| **Feature doc** | `docs/<specialist>-*.md` for architecture of that slice |

---

## Standard folder layout

```
lib/specialists/<name>/
  <name>Types.ts                 # domain / UI-facing types
  <name>InputBuilder.ts
  <name>Snapshot.ts
  <name>Narrative.ts             # optional copy / summaries
  <name>Conversation.ts
  <name>Storage/ or <name>storage/
    <name>StorageTypes.ts        # persistence records + version
    <name>Repository.ts          # interface
    local<Name>Repository.ts
    supabase<Name>Repository.ts  # when cloud exists
    <name>RepositoryFactory.ts   # local-first + sync
    <name>StorageSchema.ts       # migrate / sanitize
  evidence/                      # optional research layer
  *Tests.ts

components/<name>/
  use<Name>Input.ts
  use<Name>Snapshot.ts
  *Card.tsx / screens

contexts/<Name>DataContext.tsx   # when specialist owns mutable durable state

app/(app)/<name>/
  layout.tsx                     # mount <Name>DataProvider
  page.tsx
  history/
  settings/ or profile surfaces
  …

supabase/<name>.sql              # when needed

docs/<name>-*.md
```

Path alias: `@/`.

---

## Data

- Define **one** persistence model (versioned datastore or table set).
- Migrate safely (`migrateDatastore` / SQL `ADD COLUMN IF NOT EXISTS`).
- Status enums must be honest (`planned`, `in_progress`, `completed`, `skipped`, …). Statistics engines must ignore non-completed work.
- Prefer stable IDs (UUID when cloud-bound).

---

## Memory

On durable completions (finished workout, major decision, …):

1. Write a Memory Engine record with clear title/content/tags/area.
2. Publish relevant kernel events.
3. Do **not** claim adjacent systems changed (e.g. recovery) unless that engine actually ran on inputs.

---

## Conversation

- Build answers through the **Intelligence Pipeline** (`useIntelligencePipeline().run()`), not ad-hoc Identity/Reality/Memory fan-out.
- Pipeline returns the standard `IntelligenceResult` (summaries, evidence, reasoning, confidence, actions, trace).
- Prefer read-mostly assistance; mutations go through context/repository / Action Engine.
- Keep prompts and deterministic replies testable where practical.
- See [architecture/INTELLIGENCE_PIPELINE.md](./architecture/INTELLIGENCE_PIPELINE.md).

---

## Recommendations

Rules:

- Bounded actions: maintain / increase / reduce / repeat / insufficient data (or domain equivalent).
- Show **why** (evidence, confidence, assumptions).
- Never invent prior performance.
- No medical/legal/financial claims unless product explicitly scopes and disclaims them.

---

## History & Insights

- History pages read completed (or explicitly listed) records only for stats.
- Insights derive from repositories/engines — not ad-hoc component math duplicated elsewhere.

---

## Settings

- Profile completeness gates onboarding.
- Tracking preferences (e.g. RPE vs RIR) affect UI, not parallel schemas.

---

## Repository

```ts
// Conceptual contract — mirror GymRepository
interface XRepository {
  getProfile(): Promise<XProfile | null>
  saveProfile(profile: XProfile): Promise<XProfile>
  // entities, history, active state, …
}
```

- UI/context → repository only.
- Local-first + idempotent pending queue for offline.
- Supabase impl uses anon key + RLS; never service role in the client app.

---

## Components

- Presentational and accessible (labels, focus, ≥44px targets where interactive).
- Mobile-first for active flows (~390px), no horizontal overflow.
- Match FounderOS visual language of the surface you extend; do not invent a new design system per specialist without need.

---

## Types

- Export domain types from specialist modules.
- Contexts import domain types — they do not redefine them.
- Avoid `any` for persisted payloads; sanitize at migration boundaries.

---

## Tests

Minimum for a production specialist:

| Suite | Covers |
|-------|--------|
| Domain honesty | No invented completions; status filters |
| Repository contract | Local (and cloud mapper) behaviour |
| Schema SQL shape | Tables + RLS present (if SQL exists) |
| Critical flows | Start/resume, mutate, complete, offline queue |
| Provider wiring | If new providers are introduced |

Add scripts to `package.json` and include critical suites in `npm run check` when the specialist is user-facing.

---

## Kernel integration

Publish events at meaningful boundaries:

- Started / completed / skipped domain sessions
- Notable PRs or milestones (only when evidence exists)
- Profile updates that other engines may need

Subscribe only when the specialist must react to global events; prefer publishing outward and keeping inbound coupling minimal.

---

## Gym AI — reference checklist

| Requirement | Status (reference) |
|-------------|--------------------|
| Data | Profile, plans, sessions, active workout, progression |
| Memory | Workout log memories on complete |
| Conversation | Gym conversation card + helpers |
| Recommendations | Evidence prescriptions + live set advice + progression |
| History | `/gym/history` |
| Insights | Volume, recovery, weakness, PRs |
| Settings | Onboarding + profile editor |
| Repository | Local + Supabase + pending sync |
| Components | `components/gym/*` |
| Types | `gymTypes` + `gymStorageTypes` |
| Tests | evidence, personalisation, planned, status, schema, active, v2 |
| Docs | `gym-personalisation-v1.md`, `gym-evidence-intelligence-v1.md`, `active-workout-engine-v2.md` |

When building School / Finance / Health / … specialists, copy this checklist into the PR description and tick what ships in the slice.

---

## Anti-patterns

- Parallel “DTO” models in components that drift from domain types
- `createClient()` inside presentational components for specialist CRUD
- Completing skipped/planned items in analytics
- LLM writing directly to tables without repository + validation
- Mounting specialist providers in the global tree when only one route needs them (prefer route `layout.tsx`, as Gym does)
- Shipping UI without a persistence story and tests

---

## Related reading

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- [active-workout-engine-v2.md](./active-workout-engine-v2.md)
- [gym-personalisation-v1.md](./gym-personalisation-v1.md)
- [gym-evidence-intelligence-v1.md](./gym-evidence-intelligence-v1.md)
