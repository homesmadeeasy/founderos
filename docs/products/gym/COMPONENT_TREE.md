# Gym Product — Component Tree

UI structure for Gym. Presentation components must stay free of direct Supabase access.

---

## Route tree

```
app/(app)/gym/layout.tsx          → GymDataProvider
├── page.tsx                      → Gym home
├── workout/page.tsx              → Active logger host
├── history/page.tsx              → Session list
├── history/[id]/page.tsx         → Completed session detail
└── research/page.tsx             → Research library
```

Settings profile editing may also mount `GymProfileEditor` under app settings (outside this tree) while still using gym storage via shared modules/context patterns.

---

## Home (`/gym`)

```
GymPage
├── [loading]
├── GymOnboarding                 ← if !onboardingComplete
└── [ready]
    ├── GymHero
    ├── TodaysWorkoutCard
    │   ├── approve / start / skip / reschedule UI
    │   └── PrescriptionWhyPanel (via Why? / page event)
    ├── RecoveryCard
    ├── MuscleVolumeCard
    ├── ProgressionCard
    ├── GymSetupChecklist
    ├── GymConversationCard
    ├── ProgramMethodologyCard    ← when snapshot provides
    ├── ExerciseRecommendationsCard
    ├── WeaknessCard
    ├── GymGoalsCard
    ├── WorkoutHistoryCard
    ├── ExerciseLibraryCard
    └── GymSnapshot               ← compact / debug-style panel if shown
```

**Data:** `useGymData` + `useGymSnapshot` / `useGymInput`.  
**Events:** `RoutineGenerated`, `GymPrescriptionExplained`.

---

## Active workout (`/gym/workout`)

```
WorkoutPage
└── ActiveWorkoutLogger
    ├── Sticky header (title, elapsed, progress, sync, pause, finish)
    ├── Current exercise card
    │   ├── Prescription strip
    │   ├── Previous performance
    │   ├── Rest timer (±15, skip)
    │   ├── Why this adjustment? (live advice)
    │   ├── Logged sets list (edit)
    │   ├── Set entry form (weight/reps/RPE|RIR/notes/pain/failure)
    │   └── Exercise controls (skip, complete, substitute, set+/−, reorder, add)
    ├── Live session metrics card
    ├── Expandable exercise list (focus jump)
    ├── Fixed bottom actions (Save & exit, Discard)
    ├── Discard confirmation dialog
    └── Session review sheet → summary cards after finish
```

**Mobile:** bottom sticky actions; `max-w-lg`; overflow-x hidden.  
**Desktop:** centred column; same structure.

---

## History

```
HistoryPage
└── day groups → session rows (status labels)
    └── Link → HistoryDetailPage (completed only)
        ├── session meta
        ├── per-exercise working sets
        └── progression text (getProgressionForExercise)
```

---

## Research

```
ResearchPage
└── GymResearchLibrary
    ├── sources list
    └── claims / detail panels
```

---

## Shared primitives

| Component | Role |
|-----------|------|
| `GymCard` | Glass/card shell consistent with Gym accent |
| Hooks `useGym*` | Input/snapshot composition |

---

## Context / provider placement

```
app/(app)/layout.tsx
  └── … FounderKernel … Memory …
        └── gym/layout.tsx
              └── GymDataProvider
                    └── pages/components above
```

Gym must not require mounting `GymDataProvider` globally.

---

## State ownership

| UI concern | Owner |
|------------|-------|
| Profile, sessions, active, plan | `GymDataContext` |
| Snapshot cards | Derived via hooks (read-only view) |
| Logger draft fields | Local React state in `ActiveWorkoutLogger` |
| Sync badge | `activeWorkout.persistStatus` |
| Conversation chip UI state | `GymConversationCard` local |

---

## Accessibility map (logger)

| Control | A11y notes |
|---------|------------|
| Sync text | `aria-live="polite"` |
| Rest timer | `role="timer"` + live |
| Dialogs | `aria-modal`, labelled title |
| Errors | `role="alert"` |
| ± rest / reorder | `aria-label` |
| Exercise list toggle | `aria-expanded` |

---

## Future UI (do not ship as real)

- Video capture / technique overlay components (placeholders only in snapshot types)  
- Coach multi-athlete switcher  
- Full knowledge-graph explorer for gym nodes  

When added, extend this tree and [ROADMAP.md](./ROADMAP.md) in the same PR.

---

## Related

- [USER_FLOWS.md](./USER_FLOWS.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [TEST_PLAN.md](./TEST_PLAN.md)
