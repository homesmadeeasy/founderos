# Universal Capture — Milestone 3

## Purpose

Everything that enters FounderOS enters through **Universal Capture**. The user never chooses page, database, engine, or specialist — FounderOS classifies.

```
Reality → Signal → Universal Capture → Classifier → Object → Memory → Knowledge Suggestion → Inbox → Executive → Specialists
```

## Architecture

### Capture Engine (`lib/capture-engine/`)

| File | Role |
|------|------|
| `captureTypes.ts` | `CaptureSignal`, `CaptureResult`, enums |
| `captureStorage.ts` | localStorage `founderos-capture-engine-v1` |
| `captureParser.ts` | Strip prefixes, extract title/content |
| `captureClassifier.ts` | Rule-based `classifyCapture()` — swappable for OpenAI |
| `captureSignals.ts` | Create signal records |
| `capturePipeline.ts` | Full pipeline orchestration |
| `captureObjectBridge.ts` | Classification → Object Engine input |
| `captureMemoryBridge.ts` | Classification → Memory Engine input |
| `captureSuggestions.ts` | Knowledge suggestion eligibility |
| `captureSearch.ts` | Unified search (captures + objects + memories + knowledge) |
| `captureCommand.ts` | Command palette capture intent detection |
| `captureUtils.ts` | IDs and dates |

### Pipeline

1. Receive signal
2. Parse input
3. Classify (prefix or inference)
4. Create object (when required)
5. Create memory (always)
6. Suggest knowledge (decision/reflection/memory/question)
7. Sync to Command Center inbox + Inbox page
8. Return `CaptureResult` with instant feedback

### Prefix examples

- `task: Call accountant`
- `idea: Build calorie forecasting`
- `book: Atomic Habits`
- `memory: Felt amazing after workout`
- `decision: FounderOS should support offline mode`

No prefix → rule-based inference.

## UI

- **⌘K** — opens Universal Capture modal (front door)
- **TopBar** — capture bar + inbox count
- **Dashboard** — `UniversalCaptureCard` (replaces Quick Capture)
- **Morning / Evening** — compact capture input
- **`/inbox`** — heartbeat: new signals, processed, needs review, knowledge suggestions, objects, memories, search

## Integrations

- **Object Engine** — `storageCreateObject` + `syncCaptureFromCommandCenter`
- **Memory Engine** — `recordMemory` with `universal-capture` tags
- **Knowledge Engine** — suggestions via `suggestKnowledgeFromCapture`; manual save only
- **Executive Engine** — unresolved captures, idea pile-up, high capture volume
- **Morning** — yesterday's capture summary in briefing card
- **Evening** — today's captures section
- **Assistant** — capture today, ideas, questions, lessons
- **Command palette** — capture row + Enter to capture

## Known limitations

- Rule-based classifier only (no OpenAI)
- localStorage only
- Command palette Supabase create paths unchanged (separate stack)
- No voice/email/calendar sources yet (architecture ready via `CaptureSource` enum)
- Object engine refresh required after capture (handled in context)

## Future sources

`CaptureSource`: `voice`, `mobile`, `browser_extension`, `future_api` — pipeline accepts source without rewrite.

## Next milestone

**Specialists** — routed actions from classified captures (e.g. auto-assign workout to health specialist, idea to founder specialist).
