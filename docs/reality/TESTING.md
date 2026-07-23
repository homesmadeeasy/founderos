# Reality Engine — Testing

```bash
npm run test:reality
```

Included in `npm run check`.

## Coverage

| Area | Assertion |
|------|-----------|
| Event creation | Declared events persist with confidence 1 |
| Idempotency | Same `idempotencyKey` does not duplicate |
| Timeline ordering | Newest-first |
| Aggregation | Noisy groups produce aggregations |
| Snapshot | Narrative hints + momentum + risks |
| Assumptions | Inferred events flagged `isAssumption` |
| Validation | Invalid inputs rejected |
| Repositories | Local load/save + pending queue dedupe |
| Kernel | `WorkoutCompleted` maps and idempotently ingests |
| Adapters | Gym / task adapters → specialist view |

## Manual

1. Open `/reality` after logging a Gym workout (kernel path) or recording via future adapters.
2. Confirm timeline, momentum, and estimate badges.
3. Filter by Gym / Founder.
