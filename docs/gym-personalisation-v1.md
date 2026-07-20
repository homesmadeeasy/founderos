# Gym AI Personalisation and Workout Tracking v1

## Overview

Structured gym profile, workout approval, active session logging, and progression — all backed by a single versioned localStorage repository (`founderos-gym-data-v1`) behind a typed interface ready for Supabase migration.

## Data model

| Type | Purpose |
|------|---------|
| `GymProfile` | Onboarding + settings (goal, experience, equipment, tracking mode, increments) |
| `ApprovedWorkoutPlan` | User-approved today's workout before starting |
| `ActiveWorkout` | In-progress session (survives refresh) |
| `WorkoutSessionRecord` | Completed structured session with set-level detail |
| `ProgressionRecord` | Double-progression recommendation per exercise |
| `WorkoutTemplate` | Reserved for future templates |

## Storage

- **Key:** `founderos-gym-data-v1` (single key, no duplicate session blobs)
- **Version:** 1 with v0→v1 migration in `gymStorageSchema.ts`
- **Interface:** `GymStorageRepository` in `gymStorageRepository.ts`
- **Bounds:** 200 sessions, 100 progression records, 20 templates

## Workout lifecycle

1. Complete onboarding → `GymProfile.complete = true`
2. Generate today's workout from snapshot (profile + structured history + evidence)
3. **Approve** workout → `ApprovedWorkoutPlan`
4. **Start** → `ActiveWorkout` (auto-saved on every set change)
5. **Save & exit** / refresh → resume from `activeWorkout`
6. **Complete** → `WorkoutSessionRecord` + one memory summary + kernel events
7. **Discard** → clear `activeWorkout` with confirmation

## Progression (double progression)

Per exercise, conservative rules in `gymDoubleProgression.ts`:

- **maintain** — reps below range top or incomplete sets
- **increase** — all working sets at top of rep range, acceptable effort, no pain
- **reduce** — excessive RPE (≥9) or missed bottom of range
- **insufficient_data** — no completed working sets

Uses `smallestLoadIncrementKg` from profile. Pain flags block load increases.

## Weekly volume

`gymMuscleMapping.ts`:

- Primary muscle: 1.0 credit per working set
- Secondary muscles: 0.5 credit per working set
- Status: `insufficient_data` until meaningful history; then `below_baseline` / `within_baseline` / `above_baseline`
- Research ranges shown as contextual only

## Kernel events

`WorkoutStarted`, `SetLogged`, `SetUpdated`, `ExerciseCompleted`, `WorkoutCompleted`, `ExercisePR`, `PainReported`, `GymProfileUpdated`, `WeeklyVolumeUpdated`

## Tests

```bash
npm run test:gym-personalisation
npm run test:providers
npm run test:gym-evidence
npm run test:action-engine
npm run build
```

## Provider graph

`GymDataProvider` mounts in `app/(app)/gym/layout.tsx` only — does not alter main app provider order. `useGymSnapshot` reads structured sessions from `useGymData()`.
