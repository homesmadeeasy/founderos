# Gym Product — User Flows

All primary, secondary, edge, and failure flows for Gym. Status values refer to [DATA_MODEL.md](./DATA_MODEL.md).

---

## 1. Onboarding

```
Enter /gym (incomplete profile)
  → GymOnboarding steps (goal, experience, schedule, equipment/tracking)
  → saveProfile({ complete: true })
  → First session choice: Today | Tomorrow
       Today  → home, todayStatus Not Started
       Tomorrow → planned session scheduled; today not started as training
```

**Success:** `onboardingComplete` true; profile validates.  
**Failure:** Validation errors block complete flag.

---

## 2. Plan → Approve → Start

```
Gym home (onboarded)
  → Snapshot builds TodaysWorkout (planner + evidence)
  → User reviews prescription (+ optional Why?)
  → Approve workout  → ApprovedWorkoutPlan stored
  → Approve & Start / Start
       if activeWorkout exists → resume same id (idempotent)
       else create ActiveWorkout + in_progress session
  → Navigate /gym/workout
```

**Kernel:** `RoutineGenerated` (home), `GymPrescriptionExplained` (Why?), `WorkoutStarted` (start).

**Edge:** Double-tap Start → one session. Refresh mid-plan → approved plan retained.

---

## 3. Active workout logging

```
/gym/workout
  → Show title, elapsed, progress, sync badge, current + next exercise
  → Log set (weight, reps, RPE|RIR, notes, warmup/working, pain, failure)
       validate → upsert set by stable id → optional next-set advice
       if working set → start rest timer (absolute endsAt)
  → Edit / delete set; add set; toggle warmup
  → Complete exercise | Skip exercise (reason) | Substitute | Reorder | Add exercise | Jump via list
  → Pause → stash remaining rest ms; Resume → restore endsAt
  → Save & exit → /gym (active retained)
```

**Kernel:** `SetLogged`, `ExerciseCompleted`.

**Mobile:** Sticky chrome, large targets, numeric keyboards.  
**Desktop:** Same column layout, keyboard focusable controls.

---

## 4. Rest timer

```
Working set completed
  → restTimerEndsAt = now + exercise/plan default seconds
  → UI shows remaining = endsAt − now (background-safe)
  → ±15s adjusts endsAt; Skip clears; Pause stores pausedRestRemainingMs
```

**Future/optional:** Browser notification if permission already granted — never prompt mid-set.

---

## 5. Finish workout

```
Finish → Session review sheet
  Inputs: session RPE, energy after, discomfort, optional bodyweight, notes
  Actions:
    Finish workout → requires ≥1 valid completed working set
         → complete session + progression + clear active/approved
         → memory + kernel events + cloud sync queue
         → summary UI (volume, PRs, progression, assumptions)
    Continue logging → close sheet
    Discard draft… → confirm → cancelled session, clear active
```

**Honesty:** Incomplete sets stay incomplete; skipped exercises excluded from completed session exercise list / stats.

---

## 6. Skip day

```
TodaysWorkoutCard → Skip
  → reason (+ optional note)
  → session status skipped (no invented sets)
  → optional reschedule offer → confirm | dismiss
```

**Kernel:** `RoutineGenerated` (skipped / rescheduled planned).

---

## 7. History

```
/gym/history
  → Group sessions by calendar day
  → Show completed / skipped / cancelled / planned labels
  → Open detail only for completed
/gym/history/[id]
  → Working sets, best set, progression text per exercise
```

---

## 8. Research & conversation

```
/gym/research → browse sources/claims (read-only library)
Gym home conversation chips → answers from snapshot (deterministic)
Optional action proposals → approve/reject via action handlers (must not invent completions)
```

---

## 9. Profile / settings

```
GymProfileEditor (settings or gym surfaces)
  → patch profile → GymProfileUpdated
  → Tracking mode changes RPE vs RIR UI in logger
```

---

## Lifecycle summaries

### Workout session lifecycle

```
planned → in_progress ⇄ paused → completed
                ↘ skipped
                ↘ cancelled (discard)
```

Only **`completed`** feeds volume, progression, PRs, adherence statistics.

### Exercise lifecycle (within active workout)

```
pending / in progress
  → sets logged (partial OK)
  → finished (explicit) OR all sets completed
  → OR skipped (+ reason) — preserved originalPrescription if substituted earlier
```

Prescription (planned) is preserved separately from actual performance.

### Set lifecycle

```
prescribed slot (incomplete)
  → user edits draft fields
  → completed (+ completedAt) | deleted | reclassified warmup↔working
  → editable after complete (same id)
```

Invalid weight/reps rejected; failed flag ≠ pain flag.

### Recovery lifecycle

**Today (implemented):**

```
Lifestyle + training inputs → assessRecovery() → snapshot status/score
Finish workout → store exertion fields + RecoveryUpdated (inputs)
```

**Future (specified):** Durable recovery state over days; Health specialist boundary; no diagnosis language. Completing a workout alone must never auto-claim “recovery improved.”

### Progression lifecycle

```
Completed working sets for exercise
  → computeDoubleProgression
  → ProgressionRecord (maintain | increase | reduce | insufficient_data | …)
  → shown on summary + history detail + home ProgressionCard
  → informs next suggested load (bounded)
```

Pain blocks increases. Live mid-workout advice is separate from persisted progression records.

---

## Edge cases

| Case | Expected |
|------|----------|
| Refresh during active | Resume same workout and sets |
| Browser restart | Same via local repository |
| Route to /gym mid-workout | Active retained; Start resumes |
| Network loss mid-set | Local save; offline badge; queue |
| Duplicate Finish | Second call no-ops (active already cleared) |
| First-ever exercise PR | Not claimed as PR (no prior history) |
| All exercises skipped | Cannot finish without valid working set |
| Substitute exercise | Keep `originalPrescription`; set `substitutedFromId` |
| Legacy non-UUID ids | Local OK; cloud upsert fails → queue/fail without wiping local |
| Empty history volume | Insufficient data / honest empty states |

---

## Failure states (UX)

| State | User sees | System does |
|-------|-----------|-------------|
| Validation error on set | Inline alert | No mutate |
| Finish blocked | Alert to log a working set | Active kept |
| Sync failed | “Save failed · retrying” | Local kept; op queued |
| Offline | “Offline · queued” | Local kept |
| Discard confirm cancel | Modal closes | No change |
| Cloud auth missing | Local-only saved | Treat as saved locally |

---

## Offline behaviour

1. All logger mutations write local first.  
2. `persistStatus` reflects sync.  
3. Pending ops dedupe by stable id.  
4. On `online`, flush once per op.  
5. User can complete an entire workout offline; cloud catch-up after.

---

## Cloud sync behaviour

1. New sessions use UUID ids.  
2. Active tree mirrored to `in_progress` (+ logger paused).  
3. Complete → local persist then `syncCompletedWorkoutToCloud`.  
4. Production goal: multi-device resume without forking two actives (unique in-progress index + hydrate rules).

---

## Accessibility checklist (flows)

- [ ] All primary actions keyboard reachable  
- [ ] Discard / review dialogs labelled  
- [ ] Errors in `role="alert"`  
- [ ] Rest and sync announced politely  
- [ ] Contrast sufficient on emerald/zinc palette  

---

## Manual golden path

1. Onboard → Start today  
2. Approve & Start  
3. Log multiple sets → edit one → rest ± → pause/resume  
4. Skip one exercise with reason  
5. Refresh → resume  
6. Finish with review inputs  
7. Confirm history + volume exclude skipped  
8. Toggle offline (devtools) → log set → online → queue clears  

Detail scripts: [TEST_PLAN.md](./TEST_PLAN.md)
