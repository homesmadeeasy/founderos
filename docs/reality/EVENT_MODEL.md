# Reality Engine — Event Model

## RealityEvent

Every event includes:

| Field | Purpose |
|-------|---------|
| `id` | Stable id |
| `timestamp` | When it happened |
| `domain` | gym, founder, school, tasks, … |
| `entity` | Optional typed ref (workout, task, project) |
| `eventType` | Extensible string (`workout_completed`, …) |
| `metadata` | Open bag for specialist detail |
| `importance` | 0–1 attention weight |
| `confidence` | 0–1; declared events are 1.0 |
| `evidenceIds` | Links to evidence |
| `source` | Where it came from |
| `status` | active / aggregated / dismissed / superseded |
| `kind` | declared \| inferred |
| `idempotencyKey` | Dedupes kernel / adapter ingest |

## Sources

User input, Gym, Founder, tasks, notes, journal, calendar, identity, memory, kernel, system, integrations, inferred.

## Evidence

Each evidence row has summary, source, weight, observedAt. Facts must know why they exist.

## Extensibility

New specialists add new `eventType` strings and adapter helpers — no schema fork required. Optional relational `reality_events_index` can be filled later without changing the engine contract.
