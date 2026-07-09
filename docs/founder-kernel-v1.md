# Founder Kernel v1

## Why the Kernel exists

FounderOS had many independent engines calling each other directly. Capture invoked Signal. Evening invoked Memory and Knowledge. Morning invoked Decision and Outcome. Changes were hard to trace and easy to couple.

**Founder Kernel v1** introduces one orchestration layer:

```
Reality → Event → Founder Kernel → Subscribers → Updated cognition
```

The Kernel **does not contain business logic**. It only:

- Receives events
- Validates and queues events
- Dispatches to subscribers
- Records execution history
- Coordinates refresh across the system

## What the Kernel is NOT

- Not multiple AI agents
- Not decision scoring
- Not domain rules
- Not memory/knowledge/signal logic
- Not Redux or a second database

Business logic stays in each engine. The Kernel dispatches.

## Architecture

```
Reality (capture, morning, evening, signals, sync)
        ↓
   publish(event)
        ↓
   Founder Kernel Bus
        ↓
   Dispatcher (priority-sorted subscribers)
        ↓
   Engine reactions + UI refresh
```

Existing engines remain independent modules. Kernel coordinates them.

## Core modules

| File | Role |
|------|------|
| `kernelTypes.ts` | `FounderEvent`, `KernelSubscriber`, `KernelExecution` |
| `kernelEvents.ts` | Standard event types and labels |
| `kernelBus.ts` | Singleton event bus — publish/subscribe |
| `kernelRegistry.ts` | Subscriber catalog (metadata only) |
| `kernelDispatcher.ts` | Find subscribers, execute, isolate failures |
| `kernelHistory.ts` | Last 500 events in `founderos-kernel-history-v1` |
| `kernelLifecycle.ts` | created → queued → dispatching → completed → archived |
| `publishEvent.ts` | Public publish API |
| `kernelPayloads.ts` | Payload builders (no business logic) |
| `kernelSummaries.ts` | Assistant/history formatters |

## Standard event types (v1)

- `CaptureCreated`, `CaptureProcessed`
- `SignalCreated`, `SignalProcessed`
- `ObjectCreated`, `ObjectUpdated`, `ObjectCompleted`
- `MemoryCreated`, `KnowledgeCreated`
- `DecisionGenerated`, `DecisionAccepted`, `DecisionRejected`
- `OutcomeRecorded`
- `MorningStarted`, `MorningCompleted`
- `EveningStarted`, `EveningCompleted`
- `CalendarSynced`, `WorkoutCompleted`, `StudyCompleted`
- `UserAskedQuestion`, `UserReflectionAdded`

## Subscriber registry

| Subscriber | Priority | Key events |
|------------|----------|------------|
| Signal Engine | 10 | `CaptureCreated` |
| Object Engine | 20 | `CaptureCreated`, `ObjectUpdated` |
| Memory Engine | 30 | `MemoryCreated`, `EveningCompleted` |
| Knowledge Engine | 40 | `MemoryCreated`, `OutcomeRecorded` |
| Outcome Engine | 50 | `DecisionGenerated` |
| Domain Intelligence | 55 | `MorningStarted`, `CaptureCreated` |
| Decision Engine | 60 | `MorningStarted`, `OutcomeRecorded` |
| Morning Execution | 70 | `CaptureCreated`, `EveningCompleted` |
| Evening Review | 80 | `EveningCompleted` |
| Assistant | 90 | `DecisionGenerated`, `UserAskedQuestion` |

Handlers are wired in `KernelSubscriberBootstrap` — coordination only, no scoring rules in Kernel.

## First integrations (v1)

### Universal Capture

1. `runCapturePipeline()` creates capture artifacts (unchanged business logic)
2. `publish(CaptureCreated)`
3. Signal subscriber calls `ingestFromCapture` (removed direct cross-engine call from capture context)
4. Object/Morning/Decision subscribers refresh

### Decision Engine

1. Morning `useEffect` publishes `DecisionGenerated` when decision id changes
2. Outcome subscriber creates prediction
3. Assistant and dashboard read updated state via refresh ticks

### Evening Review

1. `completeEveningReview` publishes `OutcomeRecorded` (if outcome logged) and `EveningCompleted`
2. Morning/Evening/Knowledge subscribers refresh

### Memory / Signal / Knowledge

Publish `MemoryCreated`, `SignalCreated`, `SignalProcessed`, `KnowledgeCreated` on write operations.

## Event history

Stored in localStorage: `founderos-kernel-history-v1`

Each entry: time, event type, source, subscriber count, duration, success/failure, payload summary.

Debug UI: `/dashboard/kernel`

## Assistant integration

Kernel history powers:

- "What happened today?"
- "What changed?"
- "What triggered this recommendation?"
- "What was the last important event?"

## Design rules

Kernel files must **never** import:

- Decision scoring
- Domain evaluation logic
- Knowledge extraction
- Memory summarisation
- Signal classification
- Health/school/founder heuristics

Kernel only dispatches.

## Example event flow

**User captures "Study economics before FounderOS"**

```
1. UniversalCapture.runCapturePipeline()
2. publish(CaptureCreated)
3. Signal Engine subscriber → ingestFromCapture()
4. Object Engine subscriber → refresh objects
5. Morning/Decision subscribers → refresh tick → recompute decision
6. History entry recorded
```

**Morning generates decision**

```
1. decide() produces DecisionOutput
2. publish(DecisionGenerated)
3. Outcome Engine subscriber → createPredictionFromDecision()
4. Assistant can answer trigger chain from history
```

## Performance considerations

- Dispatch is synchronous/async per subscriber but sequential by priority
- Subscriber failures are isolated — one failure does not crash others
- History capped at 500 entries
- Re-entrant publish during dispatch queues for next drain cycle
- No network I/O in kernel path

## Known limitations (v1)

- Subscribers still use direct engine API calls (coordination layer, not full event-sourced rewrite)
- Capture pipeline still runs object/memory inline before publish (future: split into subscriber-only steps)
- No async job queue or background workers
- No cross-tab event sync
- History is local only
- Not all engine writes publish events yet (incremental rollout)

## Recommended next milestone

**Founder Kernel v2 — Event-Sourced Capture Pipeline**

- Split capture into publish-only steps (parse → publish → subscribers create memory/object/signal)
- Add `CalendarSynced` from sync engine
- Correlation/causation chains across multi-step flows
- Kernel-driven UI refresh bus (replace per-context tick pattern)
- Optional server-side event log for multi-device

## How to test

1. `npm run build`
2. Capture text → check `/dashboard/kernel` for `CaptureCreated`
3. Open `/morning` → `MorningStarted` + `DecisionGenerated` events
4. Complete `/evening` → `EveningCompleted` + `OutcomeRecorded`
5. Ask assistant "What happened today?"
6. Confirm existing pages work without infinite loops
