# Identity Engine — Observation Engine

Consumes **ObservationSignal** objects only:

```ts
{ domain, signalType, occurredAt, payload }
```

Identity never imports Gym/Founder domain types. Adapters upstream may translate workout/calendar/task events into signals.

## Rules (v1)

| Signal pattern | Candidate key | Min evidence |
|----------------|---------------|--------------|
| `session_completed` / `activity_logged` timed hours | `preferred_time_of_day` | ≥5, ≥55% in one bucket |
| same timed signals by weekday | `most_consistent_weekday` | ≥4, ≥40% share |
| `activity_skipped` by activity | `avoids_<activity>` | ≥8 |
| `performance_with_sleep` | `performance_decreases_after_poor_sleep` | ≥5 weak-after-poor, ≥60% |

If thresholds fail, inference **skips** (no invented observation).

## Materialization

Candidates with confidence ≥ **0.55** become/refresh **observed** facts. If a declared fact shares the key, both remain; `contradictionNote` explains the discrepancy.
