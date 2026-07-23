# Reality Engine — API

## Mutation (RealityEngine / RealityContext only)

| Method | Purpose |
|--------|---------|
| `recordEvent` | Ingest one life event |
| `recordEvents` | Batch ingest |
| `ingestKernelEvent` | Map + ingest a Founder kernel event |
| `dismissEvent` | Soft-dismiss from active timeline |
| `ingestSignals` (context) | Adapter signals → events |

## Read (specialists)

```ts
import {
  getToday,
  getTimeline,
  getSnapshot,
  getRecentEvents,
  getCurrentFocus,
  getMomentum,
  buildRealityPromptBlock,
} from '@/lib/reality'

const snap = await getSnapshot('gym')
const prompt = await buildRealityPromptBlock('founder')
```

React:

```ts
const { getSnapshot, getTimeline, getViewForSpecialist } = useReality()
```

**Never** call `RealityRepository.save` from specialist packages.

## Repository

`createLocalRealityRepository` · `createSupabaseRealityRepository` · `createLocalFirstRealityRepository` · `createMemoryRealityRepository` (tests)
