# Gym Product — Data Model

Canonical entities, lifecycles, and persistence. Source types: `lib/specialists/gym/gymTypes.ts`, `lib/specialists/gym/gymStorage/gymStorageTypes.ts`, `supabase/gym.sql`.

---

## Storage overview

| Store | Key / location | Role |
|-------|----------------|------|
| Local datastore | `founderos-gym-data-v1` (version **3**) | Primary SOT |
| Pending sync | `founderos-gym-pending-writes-v1` | Offline/cloud outbox |
| Supabase | `gym_*` tables | Optional durable cloud |

Caps: 200 sessions, 100 progression records, 20 templates, 24 exercises/session, 20 sets/exercise.

---

## Core entities

### GymProfile

User training identity: goal, experience, days/week, session duration, equipment, split preference, enjoy/dislike, injuries, target muscles, tracking mode (`rpe` | `rir` | `simple`), load increment, optional anthropometrics, estimated 1RMs map, onboarding flags (`complete`, `firstSessionChoiceComplete`, `firstSessionIntent`).

### ApprovedWorkoutPlan

User-approved snapshot of today’s plan before start: title, exercises with sets/repRange/targets/suggestedLoad/confidence, `whySummary`, timestamps / instance ids.

### ActiveWorkout

In-logger tree: `status: active | paused`, exercises with sets, `sessionNotes`, `restTimerEndsAt`, `pausedRestRemainingMs`, `currentExerciseKey`, `persistStatus`, `lastPersistError`.

### WorkoutSessionRecord

Durable session: calendar `scheduledFor` / `date`, `startedAt`, `completedAt`, `status`, skip metadata, exercises, volume, adherence, pain flags, post-workout review fields (`sessionRpe`, `energyAfter`, `discomfortReported`, `bodyweightKg`), `source: gym_logger`.

### ExercisePerformanceRecord

Per-session exercise: `plannedExerciseId`, ids/names/order, sets[], `notes`, `skipped` / `skipReason`, `finished`, `substitutedFromId`, `originalPrescription` (planned snapshot).

### SetPerformanceRecord

`id`, `setNumber`, `setType: warmup | working`, `weight`, `reps`, optional `rpe`/`rir`, `completed`, `completedAt`, `notes`, `painFlag`, `discomfortNote`, `failed`.

### ProgressionRecord

Persisted advice after completion: action, recommendation, evidence, claim ids, last weight/reps, target range.

### Planning types (gymTypes)

`Exercise`, `TodaysWorkout`, `PlannedExercise`, `GymSnapshot`, `GymInput`, volume/recovery/recommendation view models.

### Placeholders (future)

`TechniqueReview`, `VideoAnalysis`, `MovementAnalysis` — always `status: 'placeholder'` until a real pipeline ships.

---

## Status enums

### WorkoutSessionStatus

| Status | Counts as training stats? |
|--------|---------------------------|
| `planned` | No |
| `in_progress` | No |
| `paused` | No |
| `completed` | **Yes** |
| `skipped` | No |
| `cancelled` | No |

### ActiveWorkout.status

`active` | `paused` (logger). Cloud maps pause onto `in_progress` + `logger_status`.

### PersistStatus

`saved` | `syncing` | `failed` | `offline`

### ProgressionAction

`maintain` | `increase` | `reduce` | `deload_consideration` | `insufficient_data`  
(Note: double-progression engine today emits maintain/increase/reduce/insufficient_data; deload is reserved/UI-capable.)

### Skip reasons

- Workout: `time` | `illness` | `busy` | `recovery` | `travel` | `other`
- Exercise: `fatigue` | `pain` | `equipment` | `time` | `preference` | `other`

---

## Lifecycles (data rules)

### Workout

1. Optional `planned` row (tomorrow / reschedule).  
2. Start creates/resumes `ActiveWorkout` + `in_progress` session sharing **one id**.  
3. Mutations update active + mirror exercises on in-progress/paused session.  
4. Complete → `completed` + clear active; or skip/cancel paths without fake sets.

### Exercise

- Order stable; `plannedExerciseId` unique within session when set.  
- Substitution updates live exercise id/name; keeps `originalPrescription`.  
- Skip sets `skipped` (+ reason); excluded from completed session exercise list used for stats.

### Set

- Identity is `id` (UUID). Upserts replace by id — retries are safe.  
- Only `completed && setType === 'working' && weight > 0` contribute to volume/PRs.  
- Warmups never count as hard sets.

### Recovery (data)

- Inputs: sleep/energy/domain signals (snapshot), plus session review fields on complete.  
- Outputs: heuristic assessment on snapshot; `RecoveryUpdated` payload carries inputs + text prediction.  
- No persistent “recovery cured” flag from workout completion alone.

### Progression

- Written at complete from completed working sets only.  
- Consumed for next suggested loads and UI cards.

---

## Original prescription vs actuals

| Field | Meaning |
|-------|---------|
| Plan / `originalPrescription` | What was intended |
| `ExercisePerformanceRecord.sets` | What was logged |
| Progression / advice | Derived from actuals (+ targets), never by rewriting prescription into fake completions |

---

## Supabase schema

### Tables

| Table | Purpose |
|-------|---------|
| `gym_profiles` | 1:1 user profile |
| `gym_workout_templates` | Future templates |
| `gym_workout_template_exercises` | Template children (RLS via parent) |
| `gym_workout_sessions` | Sessions + logger fields + review fields |
| `gym_exercise_performances` | Exercises per session |
| `gym_set_performances` | Sets per exercise |
| `gym_progression_records` | Progression history |
| `gym_user_state` | `approved_plan` JSONB + migration marker |

### Notable session columns

`status` (incl. `paused`), `logger_status`, `rest_timer_ends_at`, `paused_rest_remaining_ms`, `current_exercise_key`, `session_rpe`, `energy_after`, `discomfort_reported`, `bodyweight_kg`, `adherence_score`, `total_volume_kg`, skip fields, volume/pain JSON.

### Constraints

- `completed` boolean consistent with `status = completed`
- Unique one `in_progress` per `user_id`
- Unique `(session_id, exercise_order)`; unique planned exercise id when present
- Unique `(exercise_performance_id, set_number)`

### RLS

- Root: `auth.uid() = user_id`
- Children: `EXISTS` join to owned parent — **no denormalised user_id on set rows**

Migrations must be additive/rerunnable (`ADD COLUMN IF NOT EXISTS`, safe constraint swaps).

---

## Local ↔ cloud mapping notes

| Concern | Rule |
|---------|------|
| IDs | Cloud requires UUID; local legacy `conv-*` stays local-only until mapped |
| Pause | Domain `paused` ↔ DB in_progress + logger_status |
| Approved plan | `gym_user_state.approved_plan` |
| Active clear | Complete/cancel flows; cloud `saveActiveWorkout(null)` is effectively no-op — clear via session status |

---

## Memory & knowledge records

| System | Gym write |
|--------|-----------|
| Memory Engine | Workout summary on finish |
| Vector memory | Not required for core loop (future index) |
| Evidence registry | Read for prescriptions; not user-mutable SOT |
| Knowledge Engine links | Future |

---

## Integrity invariants

1. At most one active workout locally; at most one DB `in_progress` per user.  
2. Statistics filters use `status === 'completed'` (or helpers).  
3. Set/session mutations are idempotent by stable ids.  
4. Discard/skip never create completed working sets.  
5. Storage version migrations never wipe profile/history without explicit migration strategy.

---

## Related

- [CALCULATIONS.md](./CALCULATIONS.md) — how fields are derived  
- [API.md](./API.md) — repository methods  
- `supabase/gym.sql` — authoritative SQL
