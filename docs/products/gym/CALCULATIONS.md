# Gym Product — Calculations

All derived metrics used by Gym. Implementations live in domain modules — UI must not reimplement these formulas.

**Honesty rule:** Only **completed working sets** on **completed sessions** feed volume, PRs, progression inputs, and weekly hard-set stats. Warmups, incomplete sets, planned/skipped/cancelled sessions contribute **zero**.

---

## Estimated 1RM (Epley)

**Module:** `lib/specialists/gym/gymProgression.ts` → `estimateE1RM`

\[
\text{e1RM} = \mathrm{round}\big(w \times (1 + r/30)\big)
\]

- \(w\) = weight (kg), \(r\) = reps  
- Returns `0` if \(w \le 0\) or \(r \le 0\)  
- Documented formula for product copy: **Epley**

Used by: live set advice, session PR detection, strength trends, some starting-load heuristics.

---

## Session volume

**Module:** `gymMuscleMapping.totalSessionVolumeKg`

\[
V = \sum (w_i \times r_i)
\]

over sets where `completed && setType === 'working' && weight > 0`.  
Returns `0` if session is not completed.

---

## Working / hard sets

**Module:** `countWorkingSets`

Count of sets with `completed && setType === 'working'` across the given exercise list.

Weekly aggregations use **completed sessions only** in the current week window.

---

## Muscle volume credits

**Module:** `gymMuscleMapping` / `computeMuscleVolumeFromSessions`

| Contribution | Credit per working set |
|--------------|------------------------|
| Primary muscle | **1.0** |
| Each secondary muscle | **0.5** (`SECONDARY_MUSCLE_WEIGHT`) |

Status vs baseline (when a “full week” exists):

- Full week heuristic: ≥ **2** completed sessions **and** ≥ **8** working sets in week  
- Below / within / above baseline bands use rolling baseline × **0.7** / **1.3** thresholds  
- Otherwise `insufficient_data`

---

## Adherence

**Module:** `gymWorkoutService` `computeAdherence`

\[
\mathrm{adherence} = \mathrm{round}\big(100 \times \frac{\text{completed working sets}}{\text{prescribed working sets}}\big)
\]

Prescribed = working-set slots on the active workout exercises (including skipped exercises’ slots in denominator as implemented). Document any UI copy carefully if denominator includes skipped exercises’ planned sets.

---

## Double progression (persisted)

**Module:** `gymStorage/gymDoubleProgression.ts` → `computeDoubleProgression`

Inputs: exercise history (completed sessions), target rep range, profile increment, pain flag.

| Action | Typical trigger |
|--------|-----------------|
| `insufficient_data` | No completed working history |
| `maintain` | Default / mid-range / incomplete top; **pain blocks increase** |
| `increase` | All working sets (≥2) hit top of range at acceptable effort |
| `reduce` | RPE ≥ 9 or clearly excessive strain path |
| `deload_consideration` | Reserved in types/UI — not currently emitted by core function |

Load steps use `profile.smallestLoadIncrementKg`.

**Starting weight suggestion:** last completed working weight, else ~70% e1RM rounded to increment — never invent silently in UI without labelling assumption.

---

## Live next-set advice

**Module:** `gymActiveWorkoutEngine.adviseNextSet`

Bounded actions: `continue` | `increase` | `reduce` | progression fallbacks.

Signals: last logged set reps vs target range, RPE, remaining sets, historical double progression when sets exhausted.

Always attach **evidence** text + optional **assumptionNote**. Show as “Why this adjustment?” in logger.

---

## Personal records

**Module:** `detectSessionPRs`

1. Best e1RM among current session completed working sets (`weight > 0`).  
2. Compare to best e1RM in **prior completed** sessions for same `exerciseId`.  
3. If no prior → **do not** claim PR.  
4. If `nowE1RM > bestPrior` → PR.  
5. Invalid / zero / negative loads never PR.

---

## Live fatigue proxy (session)

**Module:** `fatigueFromWorkout` (active engine)

Heuristic, not a medical score:

- Volume factor from completed set count (capped)  
- RPE factor from average RPE  
- Clamped display 0–100 with recovery hint text  

Post-summary recovery blurb uses a related fatigue heuristic from completed-set density — **copy must not claim clinical recovery change**.

---

## Recovery assessment (snapshot)

**Module:** `gymRecovery.assessRecovery`

Heuristic score (approx start ~72, adjusted by sleep, training frequency, today’s log, evening energy, domain risk), clamped, mapped to:

`ready` | `train_light` | `recover` | `deload`

**Not** a diagnosis. Finish workout publishes exertion **inputs** for interpreters; completing a session alone must not assert “you are more recovered.”

---

## Recommendations (product rules)

All recommendation surfaces (prescription, live advice, progression, conversation) must:

1. Prefer maintain / insufficient_data over aggressive jumps.  
2. Bound load changes to profile increment.  
3. Respect pain flags (no increase).  
4. Cite evidence or explicit assumptions.  
5. Never present placeholder video analysis as real findings.

---

## Out of scope calculations (future)

| Topic | Note |
|-------|------|
| Video form scores | Placeholder only |
| HRV / wearable recovery | Future integrations |
| Exact NSCA/ACSM clinical protocols | Not claimed |
| Knowledge-graph centrality metrics | Future |

---

## Test expectations

Automated tests must lock:

- Epley fixture values  
- Volume ignores warmups/incomplete/skipped  
- PR requires prior history  
- Progression ignores non-completed sessions  
- Adherence / summary assumptions remain honest  

See [TEST_PLAN.md](./TEST_PLAN.md).
