# Gym Product — Architecture

Complete technical architecture for the Gym vertical slice. Aligns with [docs/ARCHITECTURE.md](../../ARCHITECTURE.md) and [DOMAIN_FRAMEWORK.md](../../DOMAIN_FRAMEWORK.md).

---

## High-level diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Routes: /gym · /gym/workout · /gym/history · /gym/research  │
│  components/gym/*                                            │
└────────────────────────────┬─────────────────────────────────┘
                             │ useGymData / useGymSnapshot
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  GymDataContext (orchestration, optimistic UI, kernel pub)   │
└───────────────┬─────────────────────────────┬────────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│ Domain engines / services │   │ MemoryEngine.recordMemory   │
│ planner · recovery ·      │   │ FounderKernel.publish       │
│ progression · volume ·    │   └─────────────────────────────┘
│ active workout · evidence │
│ conversation · schedule   │
└───────────────┬───────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│ GymRepository (contract)                                     │
│  LocalGymRepository  ← primary SOT (localStorage v3)         │
│  SupabaseGymRepository ← optional cloud (RLS)                │
│  Factory + pending queue (offline / failed cloud)            │
└──────────────────────────────────────────────────────────────┘
```

**Rule:** Components never call Supabase or invent parallel gym models. All mutations go through `GymDataContext` → domain services → repository.

---

## App layers

| Layer | Location | Role |
|-------|----------|------|
| Routes | `app/(app)/gym/` | Pages + `GymDataProvider` layout |
| UI | `components/gym/` | Presentation, a11y, mobile logger |
| Hooks | `useGymInput`, `useGymSnapshot`, `useGymData` | Compose engines → snapshot |
| Context | `contexts/GymDataContext.tsx` | Durable state API |
| Domain | `lib/specialists/gym/` | Pure/service logic |
| Storage types | `gymStorage/gymStorageTypes.ts` | Persistence model |
| Repository | `gymStorage/gymRepository*.ts` | I/O contract |
| SQL | `supabase/gym.sql` | Cloud schema + RLS |
| Evidence | `lib/specialists/gym/evidence/` | Research claims & prescriptions |
| Docs | `docs/products/gym/` + milestone docs | Spec + history |

---

## Domain engines

| Engine / service | Responsibility |
|------------------|----------------|
| `gymWorkoutPlanner` / exercise selection | Build today’s planned workout |
| `gymSnapshot` / input builders | Compose `GymSnapshot` for UI |
| `gymRecovery` | Heuristic recovery *assessment* from lifestyle + training inputs |
| `gymVolume` / `gymMuscleMapping` | Weekly hard-set volume & baselines |
| `gymDoubleProgression` / `gymProgression` | Load advice + Epley e1RM |
| `gymActiveWorkoutEngine` | Live metrics, next-set advice, PRs, summary |
| `gymWorkoutService` | Active session mutators + complete |
| `gymScheduleService` | Planned / skip / reschedule |
| `gymConversation` | Deterministic Q&A |
| Evidence package | Rank claims, build prescriptions, research library |
| `gymWeaknessDetection` / muscle analysis | Insight cards |

---

## Repository architecture

### Contract (`GymRepository`)

Profile, active workout, approved plan, session history, set upsert/delete, exercise history, progression records.

### Local (primary today)

- Blob key: `founderos-gym-data-v1`
- Version: **3** (migrate via `gymStorageSchema`)
- Sync wrapper: `GymStorageRepository` used by context for immediate reads/writes

### Cloud (optional)

- `SupabaseGymRepository` with authenticated anon client
- Requires **UUID** entity ids (`newGymId` → `crypto.randomUUID()`)
- Maps domain tree ↔ `gym_workout_sessions` / performances / sets
- `paused` domain status → DB `in_progress` + `logger_status = paused`

### Offline / sync

```
mutation → local save (source of truth for session)
        → persistStatus: syncing
        → if offline or cloud fail → enqueue idempotent op
        → on window online → flushGymPendingOps
        → persistStatus: saved | offline | failed
```

Pending key: `founderos-gym-pending-writes-v1` (max 100 ops; stable ids replace duplicates).

**Production target:** hydrate from cloud when local empty; conflict resolve by `updatedAt`; legacy `conv-*` id map. See [ROADMAP.md](./ROADMAP.md).

---

## Supabase schema (summary)

Tables: `gym_profiles`, `gym_workout_templates`, `gym_workout_template_exercises`, `gym_workout_sessions`, `gym_exercise_performances`, `gym_set_performances`, `gym_progression_records`, `gym_user_state`.

- RLS: root tables `auth.uid() = user_id`; children via parent `EXISTS`
- Unique: at most one `in_progress` session per user
- No service-role key in the app

Detail: [DATA_MODEL.md](./DATA_MODEL.md)

---

## Kernel events

### Emitted by Gym (implemented)

| Event | Source |
|-------|--------|
| `GymProfileUpdated` | Profile save |
| `RoutineGenerated` | Gym home ready, skip, reschedule, first-session tomorrow |
| `WorkoutStarted` | Start / resume path |
| `SetLogged` | Logger |
| `ExerciseCompleted` | Finish / skip exercise |
| `WorkoutCompleted` / `WorkoutLogged` | Finish workout |
| `WeeklyVolumeUpdated` | Finish |
| `RecoveryUpdated` | Finish — **exertion inputs + prediction text**, not medical claim |
| `ExercisePR` | Confirmed PR vs prior completed history |
| `PainReported` | Pain flags on sets |
| `GymPrescriptionExplained` | User opens Why? |

### Reserved (typed, not all emitted yet)

`SetUpdated`, `GymEvidenceReviewed`, `GymPrescriptionGenerated`, `GymPrescriptionAdjusted`, `GymResearchSourceAdded`

Action-engine / conversation proposals may also publish related events via `gymActionHandlers` — must not invent completed sets.

---

## Personal memory

On successful `finishWorkout`:

1. `MemoryEngine.recordMemory` — health_log style summary (title/content/tags/`occurredAt`)
2. Kernel events for cognitive subscribers (`WorkoutLogged`, volume, recovery inputs)

Gym does **not** replace Memory Engine or vector memory. Future: optional semantic index of workout summaries.

---

## Knowledge graph

**Today:** Evidence registry + prescription claim references (`buildKnowledgeReferencesFromPrescription`). Research library UI.

**Future:** Write durable Knowledge Engine / links entries for gym principles; read shared founder knowledge tagged for training. Do not treat the evidence seed DB as a full knowledge graph SOT.

---

## Research engine

| Piece | Status |
|-------|--------|
| Seeded sources & claims | Implemented |
| Ranking / applicability / citations | Implemented |
| Prescription reasoning + Why panel | Implemented |
| `/gym/research` library UI | Implemented |
| Live PubMed/Crossref ingestion | Stub / future |

Prescriptions must stay within claim applicability and show assumptions when data is thin.

---

## Video analysis

**Status:** Placeholder only (`TechniqueReview` / `VideoAnalysis` / `MovementAnalysis` with `status: 'placeholder'` in snapshot).

**Future product intent:** optional form/video upload → offline or server analysis → technique cues linked to exercise instances — never required to complete a workout; never blocks logging; no injury diagnosis.

---

## AI reasoning pipeline

```
External / OS inputs (sleep, energy, calendar risk, …)
        │
        ▼
 useGymInput / buildGymInput  →  GymInput
        │
        ▼
 Domain engines (deterministic)
   · recovery assess
   · volume
   · planner + evidence prescriptions
   · weaknesses / methodology
        │
        ▼
 buildGymSnapshot  →  UI cards + conversation answers
        │
 User approves & trains
        │
        ▼
 Active engines (live advice, e1RM, fatigue proxy)
        │
        ▼
 finish → progression records + summary + memory + kernel
```

**LLM role (current):** Not required for core Gym loop. Conversation is largely deterministic over snapshot. Future LLM assists must be proposal-only and validated before persistence.

**Honesty:** Prefer `insufficient_data` over fabricated loads or PRs.

---

## Accessibility, mobile, desktop

| Surface | Requirement |
|---------|-------------|
| Active logger | Mobile-first ~390px; sticky header + bottom actions; no horizontal overflow |
| Touch | ≥44px targets (`min-h-11` / `min-h-12`) |
| Focus | Visible `focus-visible` outlines |
| Live regions | Sync status, rest timer (`aria-live`) |
| Dialogs | `role="dialog"`, labelled, confirm discard/finish |
| Desktop | Same logger in `max-w-lg` column; home dashboard cards in responsive grid |
| Notifications | Rest-complete notification **only** if permission already granted |

---

## Failure states (architecture)

| Failure | Behaviour |
|---------|-----------|
| No profile | Onboarding gate |
| No approved plan on start | No-op / stay on home |
| Finish without valid working set | Reject; keep active |
| Cloud upsert non-UUID | Error → queue offline / fail status; local intact |
| Offline | Local continues; `persistStatus: offline` |
| Duplicate Start clicks | Resume same `ActiveWorkout` id |
| Duplicate set complete clicks | Same set `id` upsert |

---

## Related milestone docs

- [gym-personalisation-v1.md](../../gym-personalisation-v1.md)
- [gym-evidence-intelligence-v1.md](../../gym-evidence-intelligence-v1.md)
- [active-workout-engine-v2.md](../../active-workout-engine-v2.md)
