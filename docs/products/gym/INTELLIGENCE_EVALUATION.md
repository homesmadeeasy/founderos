# Gym Intelligence Evaluation

Deterministic fixtures for Gym + Intelligence Pipeline grounding.

Run:

```bash
npm run test:intelligence-pipeline
npm run test:gym-intelligence-eval
```

## Scenarios

| # | Scenario | Assertions |
|---|----------|------------|
| 1 | New user, minimum onboarding, no history | Declared goal present; missing history explicit; baseline plan; no invented sets |
| 2 | Incomplete onboarding | `missingInformation` populated; readiness ≤ minimum_ready |
| 3 | Several completed workouts | History evidence present; higher readiness |
| 4 | Declared vs observed preference contradiction | Both retained; warning / degraded observed stage |
| 5 | Stale recovery evidence | Warning or degraded domain stage; confidence not max |
| 6 | Injury restriction | Constraint in context; mentioned as declared |
| 7 | Offline / local-only sources | Pipeline still returns; skipped stages OK |
| 8 | Missing Identity or Reality | Graceful skip; no throw |
| 9 | Duplicate requestId | Idempotent; hooks once |
| 10 | No progression evidence | Does not invent PRs / progression claims |

Prefer asserting **structured context** (`IntelligenceResult.responseContext`) over exact prose.
