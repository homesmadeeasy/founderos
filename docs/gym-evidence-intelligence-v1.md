# Gym Evidence Intelligence V1

## Purpose

Gym Evidence Intelligence makes every exercise prescription traceable to **approved research** and **personal user context**. Prescriptions are recommended starting points — never presented as definitively optimal.

## Architecture

```
GymInput → buildGymSnapshot → generateTodaysWorkout
                                    ↓
                         buildExercisePrescription (per exercise)
                                    ↓
              selectTrainingDose + rankClaimsForContext + explainPrescription
                                    ↓
                    WorkoutExercisePrescription + WorkoutResearchSummary
```

### Evidence layer (`lib/specialists/gym/evidence/`)

| Module | Role |
|--------|------|
| `gymEvidenceTypes.ts` | Types: sources, claims, prescriptions, rationale |
| `gymEvidenceSeed.ts` | Isolated approved seed data (update without touching logic) |
| `gymEvidenceRegistry.ts` | In-memory registry loaded from seed |
| `gymEvidenceClaims.ts` | Claim queries by variable and goal |
| `gymEvidenceSearch.ts` | Search sources and claims |
| `gymEvidenceRanking.ts` | Rank claims for user context |
| `gymEvidenceApplicability.ts` | Re-exports ranking/applicability |
| `gymEvidenceCitations.ts` | Citation formatting and freshness |
| `gymEvidenceUtils.ts` | Shared helpers |
| `gymPrescriptionReasoning.ts` | Prescription engine |
| `gymPrescriptionContext.ts` | User context builder |
| `gymEvidenceIntegration.ts` | Cognitive/Knowledge references (no full-text copy) |
| `researchIngestion.ts` | Server-only adapter stubs (Crossref, PubMed) |

## Evidence hierarchy

1. **Approved research** — may directly affect prescriptions (`status: approved`)
2. **Provisional research** — visible in library only; cannot override approved guidance
3. **Personal evidence** — memories, logs, health signals (`GymEvidence` in snapshot)
4. **Fallback library defaults** — used when confidence is low; clearly labelled

When personal outcomes conflict with general recommendations, both are retained and dose is adjusted conservatively.

## Approved seed sources (V1)

| ID | Source |
|----|--------|
| `src-acsm-progression-2009` | ACSM Position Stand on resistance training progression (2009) |
| `src-who-pa-2020` | WHO physical activity guidelines (2020) |
| `src-au-pa-adults` | Australian Government adult activity guidelines |
| `src-schoenfeld-volume-2017` | Schoenfeld et al. hypertrophy volume meta-analysis (2017) |
| `src-schoenfeld-frequency-2016` | Schoenfeld et al. training frequency meta-analysis (2016) |
| `src-grgic-failure-2022` | Grgic et al. proximity-to-failure meta-analysis (2022) |

One **provisional** source is seeded to verify it does not affect prescriptions.

## Prescription algorithm

1. Build `PrescriptionContext` from goal, experience, history, volume, recovery, injuries, pain flags
2. Rank approved claims per variable (reps, sets, rest, RPE, volume)
3. `selectTrainingDose()` combines claims with context modifiers
4. `calculatePrescriptionConfidence()` — missing data lowers confidence; nothing is invented
5. `validatePrescriptionSafety()` — pain/injury → conservative language + professional referral wording
6. `explainPrescription()` — personal reason, research basis, assumptions, citations
7. Mode: `evidence_informed` (claims + confidence ≥ 50) or `fallback`

### What replaced hard-coded 3×6 @ RPE 7

**Previously** (`gymWorkoutPlanner.buildPlannedExercise`):
- Sets: 3 for compounds
- Reps: lower bound of library `repRange` (`'6-10'` → **6**)
- RPE: 7 for non-strength goals

**Now**: evidence-ranked dose per goal. Hypertrophy/general fitness uses **8–12** rep starting points from ACSM hypertrophy guidance; beginners start conservatively at RPE 6–7; high weekly chest volume reduces sets.

## Kernel events

- `GymEvidenceReviewed` — evidence freshness check on gym page load
- `GymPrescriptionGenerated` — workout prescription summary
- `GymPrescriptionExplained` — user opened "Why this?" for an exercise
- `GymResearchSourceAdded` — reserved for admin-approved ingestion
- `GymPrescriptionAdjusted` — reserved for future adjustments

No subscriber republishes these events (no loops).

## UI

- **Why this?** — per-exercise expandable rationale (`PrescriptionWhyPanel`)
- **Program methodology** — compact methodology card
- **Research library** — `/gym/research`
- Badges: **Evidence-informed** vs **Fallback**

## Future research ingestion

`researchIngestion.ts` defines adapter interfaces for Crossref/PubMed. A future scheduled job would:

1. Search for newer systematic reviews/guidelines
2. Compare candidates with existing sources
3. Create `pending_admin_review` proposals
4. Require administrator approval before updating `gymEvidenceSeed.ts`

Unreviewed web results must never automatically change user prescriptions.

## Limitations (V1)

- Seed data is static; ingestion adapters are stubs
- `worldModel` not yet consumed in prescription context
- Short-session detection not wired to calendar
- No automatic Knowledge Engine writes (references only)
- Load estimation uses RPE-based method unless history provides e1RM

## Tests

```bash
npm run test:gym-evidence
```

Covers beginner, hypertrophy, strength, recovery, volume, pain, equipment, determinism, bench explanation, and claim registry integrity.
