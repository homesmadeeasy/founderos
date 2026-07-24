# Active Workout Engine v2

Mobile-first live workout logging for FounderOS Gym AI. Extends the existing gym domain (types, `GymDataContext`, repositories, kernel events) without replacing the Gym home experience or inventing parallel models.

## Architecture

```
TodaysWorkoutCard (Approve & Start | Start today instead)
        │
        ▼
GymDataContext.startWorkoutFromPlan() / startWorkoutTodayInstead()
  · startWorkoutTodayInstead: firstSessionIntent→today, cancel deferred planned, approve if needed
  · resume existing active workout if present (idempotent)
  · else createActiveWorkoutFromPlan → ActiveWorkout + in_progress session
  · local persist + optional cloud sync via GymRepository
        │
        ▼
/gym/workout → ActiveWorkoutLogger
  · set logging, rest timer, exercise controls, review
  · every mutation → saveActiveWorkout → GymDataContext
        │
        ▼
persistActiveWorkoutWithSync (local-first)
  · GymStorageRepository (localStorage, storage v3)
  · pending queue when offline / cloud fails
  · flushGymPendingOps on `online`
        │
        ▼
finishWorkout(review?) → completeWorkout → persistCompletedWorkout
  · session + progression + clear active
  · syncCompletedWorkoutToCloud (queued if needed)
  · kernel: WorkoutCompleted, WorkoutLogged, WeeklyVolumeUpdated, RecoveryUpdated (exertion inputs), ExercisePR, PainReported
```

**UI must go through `GymDataContext`.** Repositories implement `GymRepository`; local is primary. Supabase is optional cloud with RLS; domain IDs are UUIDs (`newGymId`).

## Lifecycle

| Status | Meaning |
|--------|---------|
| `planned` | Scheduled / approved, not started |
| `in_progress` | Active logger open |
| `paused` | User paused; rest remaining stashed in `pausedRestRemainingMs` |
| `completed` | Finished with ≥1 valid working set |
| `skipped` | Day skipped (not counted as training) |
| `cancelled` | Discarded draft |

Active logger status is `active` | `paused` on `ActiveWorkout`, mirrored onto the session row.

**Resume safety:** Active tree is stored under `activeWorkout` and mirrored into the `in_progress`/`paused` session. Refresh, route change, and browser restart reload from the repository. Rest uses absolute `restTimerEndsAt` timestamps (not render-loop counters).

## Persistence

- **Local:** `founderos-gym-data-v1` via `GymStorageRepository` (migrated to storage version 3).
- **Pending:** `founderos-gym-pending-writes-v1` — idempotent ops keyed by stable id (`active:{id}`, `complete:{id}`, …).
- **Cloud:** `SupabaseGymRepository` maps to `gym_workout_sessions` / `gym_exercise_performances` / `gym_set_performances`. Requires UUID session ids.
- Mutations are optimistic in UI; `persistStatus`: `saved` | `syncing` | `offline` | `failed`.

Set upserts use stable set `id`s — retries and duplicate clicks update the same row.

## Calculations

| Metric | Rule |
|--------|------|
| Volume | Completed **working** sets only: `Σ weight × reps` (`totalSessionVolumeKg`) |
| Weekly hard sets | Completed sessions only; skipped/incomplete excluded |
| Estimated 1RM | **Epley:** `weight × (1 + reps/30)` (`estimateE1RM`) |
| PRs | Only vs prior **completed** history; first-ever set is not a PR; invalid weight/reps ignored |
| Progression | Double progression on completed working sets; actions: maintain / increase / reduce / deload_consideration / insufficient_data |
| Adherence | Completed working sets ÷ prescribed working sets |
| Recovery | Session RPE / energy / discomfort are **inputs**; engine does not claim recovery “changed” solely because a workout finished |

Warm-up sets and incomplete sets never contribute to volume, PRs, or progression.

## Schema changes (`supabase/gym.sql`)

Additive, rerunnable:

- Sessions: `paused` status, `paused_rest_remaining_ms`, `current_exercise_key`, `session_rpe`, `energy_after`, `discomfort_reported`, `bodyweight_kg`
- Exercises: `finished`, `skip_reason`, `original_prescription`
- Sets: `failed`

RLS unchanged (parent-scoped child policies). Re-run `gym.sql` on staging safely.

## Manual test steps

1. Open `/gym`, complete onboarding if needed, approve today’s plan.
2. Tap **Approve & Start** twice quickly → one active session; land on `/gym/workout`.
3. Log 2+ sets (weight/reps); confirm defaults from previous set; edit one set; delete a set.
4. Start rest → background tab ~20s → remaining time matches wall clock; use ±15s / skip.
5. Skip an exercise with reason; substitute a compatible movement; reorder; add exercise.
6. Refresh the page → same workout and sets resume.
7. Finish → review (RPE, energy, discomfort, optional bodyweight) → **Finish workout**.
8. Confirm history shows completed session; volume excludes skipped/incomplete; active cleared.
9. Optional: go offline, log a set, go online → pending queue flushes without duplicates.

## Limitations

- Supabase sync only when authenticated; local remains source of truth for the session.
- Legacy local `conv-*` ids are not cloud-upsertable; new sessions use UUIDs.
- Audio / notifications only if permission already granted — never prompted mid-workout.
- Cloud `saveActiveWorkout(null)` is a no-op; clear happens via complete/cancel session flows.
- Progression “Why this adjustment?” surfaces engine evidence text; future work can deepen confidence scoring UI.

## Next recommended milestone

**Cloud identity map + multi-device resume** — map legacy local ids to cloud UUIDs, hydrate active workout from Supabase when local is empty, and conflict-resolve by `updatedAt` so a phone and laptop cannot fork two in-progress trees.
