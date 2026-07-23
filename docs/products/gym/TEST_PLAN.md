# Gym Product — Test Plan

Manual and automated verification for Gym. Required before merging Gym behaviour changes ([WORKFLOW.md](../../WORKFLOW.md)).

---

## Quality gate

```bash
npm run typecheck
npm run test:gym-evidence
npm run test:gym-personalisation
npm run test:gym-planned
npm run test:gym-status
npm run test:gym-schema
npm run test:gym-active
npm run test:gym-active-v2   # alias: test:gym-persistence
npm run test:providers       # if providers touched
npm run build                # release-facing
```

Or: `npm run check` (includes the gym suites above).

---

## Automated testing plan

| Suite | File | Must prove |
|-------|------|------------|
| Evidence | `evidence/gymEvidenceTests.ts` | Ranking/prescription honesty |
| Personalisation | `gymPersonalisationTests.ts` | Profile, progression, volume filters, storage |
| Planned exercises | `gymPlannedExerciseTests.ts` | Stable ids, no duplicate React keys, approve/start |
| Status | `gymStatusTests.ts` | Skip/reschedule, migration version |
| Schema SQL | `gymSchemaSqlTests.ts` | Tables, RLS shape, v2 columns, paused status |
| Active engine | `gymActiveWorkoutEngineTests.ts` | Resume, no invented completions, advice, PRs |
| Active v2 / persistence | `gymActiveWorkoutV2Tests.ts` | Idempotent start/sets, rest timestamps, offline queue, UUID ids, substitute |

### Required coverage themes (add tests when missing)

- Approve & start creates one session; repeated start does not duplicate  
- Refresh resumes active tree  
- Set create/edit/delete idempotent by id  
- Rest remaining correct after pause/background (timestamp maths)  
- Complete updates history and clears active  
- Incomplete/skipped excluded from volume/progression  
- PR logic ignores invalid / first-ever without prior  
- Offline enqueue idempotent; flush safe without cloud  
- Local repository contract for set upsert/delete  
- Unique exercise/set keys (no duplicate React keys)

### Not yet (track in roadmap)

- Full Supabase integration tests against live project (RLS two-user)  
- Component/RTL suite for logger  
- Multi-device conflict fixtures  

---

## Manual testing plan

### A. Golden path (desktop + ~390px mobile)

1. Fresh profile → complete onboarding → Start today.  
2. Open Why? on a prescription → rationale visible.  
3. Approve & Start (double-click Start once) → single logger session.  
4. Log ≥3 working sets across ≥2 exercises; confirm previous-set defaults.  
5. Edit one completed set; delete one set; add one set; mark one warmup.  
6. Complete working set → rest timer → −15 / +15 / skip.  
7. Pause mid-rest → resume → remaining ≈ stashed.  
8. Skip an exercise with reason; substitute a compatible movement; reorder; jump via list.  
9. Refresh page → same workout/sets/sync.  
10. Finish → fill RPE/energy/discomfort/optional BW → Finish workout.  
11. Summary shows duration, volume, progression; assumptions honest.  
12. History lists completed; detail matches; skipped not counted as volume.  

### B. Skip / discard

1. Skip day with reason → no completed volume change.  
2. Confirm or dismiss reschedule.  
3. Start workout → Discard with confirm → cancelled; no completed stats.  

### C. Offline / sync

1. DevTools offline → log sets → badge “Offline · queued”.  
2. Online → queue flushes; badge returns to saved (or failed with local intact).  
3. Repeat set complete rapidly → still one set id.  

### D. Honesty / edge

1. Try Finish with zero working sets → blocked.  
2. Planned/skipped sessions do not raise weekly volume cards.  
3. First exercise ever → no PR banner.  
4. Pain flag → progression does not recommend increase.  

### E. Accessibility

1. Tab through logger controls; focus rings visible.  
2. Screen-reader / inspection: sync + timer live regions; dialogs labelled.  
3. Touch targets ≥44px on mobile viewport.  
4. No horizontal scroll at 390px width.  

### F. Research / conversation

1. `/gym/research` loads sources without errors.  
2. Home chips answer from snapshot; no invented session completions.  

---

## Edge cases matrix

| Edge | Pass criteria |
|------|----------------|
| Duplicate Start | One `ActiveWorkout` id |
| Finish twice | Second no-op |
| Non-UUID legacy cloud | Local OK; sync fail/queue without wipe |
| All exercises skipped | Cannot complete as trained |
| Empty library substitute | Empty state, no crash |
| Notification denied | Workout unaffected |

---

## Failure injection

| Inject | Expect |
|--------|--------|
| `navigator.onLine = false` | Offline path |
| Throw in cloud save (mock) | `failed` + queue; local retained |
| Corrupt local JSON | Migration/sanitize or safe empty — never silent data loss without log |

---

## Sign-off template (PR)

```markdown
## Gym test sign-off
- [ ] Automated gym suites green
- [ ] Golden path desktop
- [ ] Golden path mobile ~390px
- [ ] Offline path
- [ ] Honesty checks
- [ ] A11y spot-check
- [ ] Docs updated if behaviour changed
```
