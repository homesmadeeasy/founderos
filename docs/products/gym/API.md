# Gym Product — API

Internal APIs for Gym (no public HTTP gym CRUD today). External callers are React UI, kernel subscribers, and optional Supabase via repository.

---

## 1. GymDataContext API

**File:** `contexts/GymDataContext.tsx`  
**Hook:** `useGymData()` (must be under `GymDataProvider` in `app/(app)/gym/layout.tsx`)

### State

| Field | Type / meaning |
|-------|----------------|
| `ready` | Hydrated from storage |
| `profile` | `GymProfile \| null` |
| `profileComplete` / `onboardingComplete` | Derived gates |
| `sessions` | All session records |
| `completedSessions` | Stats-safe filter |
| `activeWorkout` | Current logger tree |
| `approvedPlan` | Approved today’s plan |
| `progressionRecords` | Persisted advice |
| `todayStatus` | Calendar status helper |
| `pendingReschedule` | Optional follow-up after skip |

### Methods

| Method | Behaviour |
|--------|-----------|
| `saveProfile(patch)` | Merge, validate optional complete, `GymProfileUpdated` |
| `chooseFirstSession(intent, title?)` | Today vs tomorrow scheduling |
| `approveWorkoutPlan(workout, whySummary)` | Persist `ApprovedWorkoutPlan` |
| `clearApprovedPlan()` | Clear approval |
| `startWorkoutFromPlan()` | Idempotent create/resume + `WorkoutStarted` + sync |
| `startWorkoutTodayInstead(workout, why)` | Clear deferred tomorrow intent, cancel planned placeholder, approve if needed, then start (one active) |
| `keepWorkoutForTomorrow()` | Ack only — no completed history |
| `changeFirstSessionSchedule(title)` | Cancel deferred tomorrow planned; offer `pendingReschedule` |
| `saveActiveWorkout(workout)` | Local + mirror session + async sync status |
| `discardActiveWorkout()` | Cancel + clear + sync clear attempt |
| `finishWorkout(review?)` | Complete if valid working set; memory; events; cloud sync |
| `skipWorkout(reason, note?)` | Skip + optional reschedule offer |
| `confirmReschedule()` / `dismissReschedule()` | Reschedule follow-up |
| `refresh()` | Reload from local repository |

### Helpers (exported)

- `buildWhyWorkoutSummary(workout, hasHistory)`
- `getProgressionForExercise(...)`

---

## 2. Repository API

**Interface:** `lib/specialists/gym/gymStorage/gymRepository.ts`

| Method | Purpose |
|--------|---------|
| `getProfile` / `saveProfile` | Profile |
| `getActiveWorkout` / `saveActiveWorkout` | Active tree (`null` clear semantics differ local vs cloud) |
| `getApprovedPlan` / `saveApprovedPlan` | Approval |
| `getWorkoutHistory` | Sessions |
| `createWorkoutSession` / `updateWorkoutSession` / `completeWorkoutSession` | Session writes |
| `createOrUpdateSet` / `deleteSet` | Idempotent set mutations |
| `getExerciseHistory` | Filter history by exercise |
| `saveProgressionRecord` / `listProgressionRecords` | Progression |

**Implementations:** `LocalGymRepository`, `SupabaseGymRepository`  
**Factory:** `persistActiveWorkoutWithSync`, `syncCompletedWorkoutToCloud`, `flushGymPendingOps`, `tryGetSupabaseGymRepository`

**Sync statuses:** `PersistStatus` on `ActiveWorkout`.

---

## 3. Domain service API (selected)

| Module | Entry points |
|--------|----------------|
| `gymWorkoutService` | `createOrResumeActiveWorkoutFromPlan`, set CRUD, pause/resume, rest ±, skip/finish exercise, substitute/reorder/add, `completeWorkout`, `validateCompletedSetInput`, … |
| `gymActiveWorkoutEngine` | `adviseNextSet`, `computeLiveWorkoutMetrics`, `detectSessionPRs`, `buildWorkoutSummaryDetail`, navigation helpers |
| `gymDoubleProgression` | `computeDoubleProgression`, `suggestStartingWeight`, `buildProgressionRecord` |
| `gymScheduleService` | Skip / first-session tomorrow |
| `gymConversation` | Answer chips from snapshot |
| Evidence package | Prescription build, ranking, library queries |

UI should prefer context methods for persistence; call engines for pure derivation.

---

## 4. Snapshot / input API

| Hook / fn | Role |
|-----------|------|
| `useGymBaseInput` | Base OS inputs without cognitive |
| `useGymInput` | Base + cognitive |
| `useGymSnapshot` | `buildGymSnapshot` memo |
| `buildGymSnapshot` | Pure composition for cards |

---

## 5. Kernel event payloads (Gym)

Publish via `useFounderKernel().publish` / context.

| Type | Typical payload fields |
|------|------------------------|
| `GymProfileUpdated` | `profileId`, `complete` |
| `RoutineGenerated` | `title`, `status`, scheduling/skip meta |
| `WorkoutStarted` | `workoutId`, `title`, `status` |
| `SetLogged` | `exerciseId`, `setId`, `weight`, `reps`, `e1rm` |
| `ExerciseCompleted` | `exerciseId`, `exerciseName`, optional `skipped` |
| `WorkoutCompleted` | session summary fields + review inputs |
| `WorkoutLogged` | sessionId, title, volume, adherence |
| `WeeklyVolumeUpdated` | `sessionId` |
| `RecoveryUpdated` | `sessionId`, prediction, exertion inputs, honesty note |
| `ExercisePR` | `exerciseName`, `detail`, `e1rm` |
| `PainReported` | exercise ids/names |
| `GymPrescriptionExplained` | prescription context from home |

Reserved types may exist in `kernelEvents.ts` without emitters yet — see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 6. Memory API usage

`useMemoryEngine().recordMemory({ type: 'health_log', title, content, area: 'health', tags: ['gym', …], occurredAt })` on successful finish.

---

## 7. HTTP / external APIs

| API | Gym use |
|-----|---------|
| Supabase Auth | Gate `/gym` via app shell |
| Supabase PostgREST | Only inside `SupabaseGymRepository` |
| OpenAI | Not required for core Gym loop |
| Future vision API | Not implemented |

There is **no** dedicated `/api/gym/*` router today. Adding one later must still sit behind `requireAuth` and call domain/repository layers — not duplicate logic in the route.

---

## 8. Pending sync op types

`save_active` | `upsert_session` | `complete_session` | `save_profile` | `save_progression`

Stable ids examples: `active:{workoutId}`, `complete:{sessionId}`, `prog:{recordId}`.

---

## 9. Invariants for API consumers

1. Never write completed sets for skip/cancel.  
2. Never bypass context for specialist mutations from components.  
3. Treat cloud failures as non-fatal when local succeeded.  
4. Idempotent retries required for all network-facing methods.
