# Reality Engine — Architecture

## Placement

```
Specialists / Kernel events / Adapters
        ↓ record / ingest
  RealityEngine (sole mutation authority)
        ↓
  RealityRepository (local-first → optional Supabase)
        ↓
  Datastore: events · evidence · aggregations · snapshot cache
        ↓ read
  Public API / RealityContext → Gym · Founder · School · …
```

## Layers

| Layer | Location |
|-------|----------|
| Domain | `lib/reality/` |
| Context | `contexts/RealityContext.tsx` |
| UI | `components/reality/`, `app/(app)/reality/` |
| SQL | `supabase/reality.sql` |

## Relationship to other systems

| System | Relationship |
|--------|----------------|
| **Identity** | Peer layer (who vs what). Reality may record `identity_updated` events; it does not store identity facts. |
| **Cognitive Reality** | Unchanged. Belief reconciliation stays in `lib/cognitive-model/`. Kernel types `RealityBeliefUpdated` etc. remain cognitive. Life-state events use `RealityEventRecorded` / `RealitySnapshotUpdated`. |
| **Memory Engine** | Historical Layer-2 records; Reality is the live timeline. Memory creation can ingest as a Reality event via kernel. |
| **Gym / Founder** | Publish domain kernel events; RealityProvider subscribes and ingests. Specialists read snapshot via public API. |

## Kernel

`RealityProvider` (inside `FounderKernelProvider`) registers a subscriber for mapped domain events (`WorkoutCompleted`, `MemoryCreated`, `ObjectCompleted`, …) and publishes:

- `RealityEventRecorded`
- `RealitySnapshotUpdated`
- `RealityAggregationCreated` (when applicable)
- `SnapshotUpdated`

## Persistence

- Local: `founderos-reality-v1`
- Pending: `founderos-reality-pending-v1`
- Cloud: `reality_profiles.datastore` JSONB (+ optional index tables)

## Non-goals (v1)

- Replacing cognitive belief Reality
- Multi-user shared timelines
- Full calendar / wearable sync (placeholders + adapters only)
