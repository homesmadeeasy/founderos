# Reality Engine — Overview

The Reality Engine is the **live operating state** of FounderOS. Every specialist (Gym, Founder, School, Finance, Health, Travel, …) reads the same model of what is happening in the user’s life.

| Layer | Question |
|-------|----------|
| **Identity** | Who is this person? |
| **Reality** | What is happening right now? |

This is **not** the cognitive-model “belief Reality” that reconciles conversation claims. That system remains under `lib/cognitive-model/`. This engine stores **life events**, a **unified timeline**, **aggregations**, and a **current snapshot**.

---

## Mission

FounderOS should always know:

- what happened today
- what is happening now
- what deserves attention

…without asking the user again.

---

## Core principles

1. **Event-based.** Everything is a typed life event with source, confidence, and evidence.
2. **Declared ≠ inferred.** Assumptions are never presented as hard facts.
3. **One timeline.** All domains contribute to a single chronological view.
4. **Aggregate noise.** Prefer meaningful summaries over fifteen micro-updates.
5. **Specialists are read-only.** All writes go through `RealityEngine`.
6. **Adapters, not coupling.** Gym/Founder/etc. never own Reality internals.
7. **Kernel-aware.** Domain kernel events can ingest into Reality idempotently.

---

## Document map

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layers, flow, vs cognitive Reality |
| [EVENT_MODEL.md](./EVENT_MODEL.md) | Events, sources, evidence |
| [SNAPSHOTS.md](./SNAPSHOTS.md) | Current-state snapshot |
| [TIMELINE.md](./TIMELINE.md) | Unified timeline + aggregation |
| [API.md](./API.md) | Public interfaces |
| [TESTING.md](./TESTING.md) | Test plan |

---

## Related handbook

- [docs/VISION.md](../VISION.md)
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
- [docs/identity/OVERVIEW.md](../identity/OVERVIEW.md)
