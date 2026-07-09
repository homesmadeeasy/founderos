# Connected Reality — Signal Engine

FounderOS **Connected Reality** is the local-first signal layer that observes real-world activity without requiring live API keys yet. External sources (Google Calendar, Apple Health, GitHub, Gmail, Cursor, etc.) plug in later; today the engine runs on **mock seeds**, **manual mock signals**, and **Universal Capture** bridges.

## Architecture

```
External source (future) ──┐
Manual capture ────────────┼──► signalSources / signalClassifier
Mock seeds ────────────────┘         │
                                     ▼
                              signalPipeline.ingestSignal
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
            signalStorage      Memory Engine    Morning / Evening / Assistant
            (localStorage)     (important)      (context + Q&A)
```

### Storage key

`founderos-signal-engine-v1` in `localStorage`.

### Core modules (`lib/signal-engine/`)

| File | Role |
|------|------|
| `signalTypes.ts` | `Signal`, `SignalSource`, `SignalType`, labels |
| `signalStorage.ts` | CRUD, search, seed on first load |
| `signalClassifier.ts` | Rule-based type + confidence |
| `signalSources.ts` | Mock seeds, capture bridge |
| `signalPipeline.ts` | Ingest, process, mock create |
| `signalSearch.ts` | Search, summaries, morning notes |
| `signalUtils.ts` | IDs, dates, helpers |
| `signalMemoryBridge.ts` | Important signals → `MemoryRecord` |

## Signal model

| Field | Description |
|-------|-------------|
| `id` | Unique id |
| `source` | `manual_capture`, `calendar`, `health`, `github`, `email`, `cursor`, … |
| `type` | `activity`, `event`, `health`, `coding_session`, `idea`, … |
| `title` / `content` | Human-readable payload |
| `timestamp` | When the event occurred |
| `confidence` | `low` \| `medium` \| `high` |
| `processed` | Whether memory writeback ran |
| `relatedObjectIds` / `relatedMemoryIds` | Graph links |
| `metadata` | Source-specific JSON (sleep hours, duration, etc.) |

## Integrations

### Universal Capture

Every capture also creates a Signal via `createSignalFromCapture` in `UniversalCaptureContext`. Capture signals use source `manual_capture` and link back to the capture id.

### Memory Engine

`processSignal()` writes a `MemoryRecord` for important signal types (health, workout, coding, events, ideas). Evening review can mark signals as **mattered**; completing the review processes unprocessed mattered signals into memory.

### Morning Execution

`buildDailyContext` loads recent signals and `buildMorningSignalNotes` into `DailyContext.signalNotes`. Daily reasoning folds these into the plan summary and risks (e.g. workout not logged, sleep, calendar, coding).

### Evening Review

`/evening` shows **Today's Signals** with checkboxes. Selected ids are stored in `EveningReview.matteredSignalIds` and processed on **Complete review**.

### Assistant

Command Center assistant accepts a signal snapshot and answers:

- What happened today?
- What signals came in?
- Did I code today?
- Did I train today?
- What does my calendar suggest?
- What health signals matter?

## UI

- **`/signals`** — count, filters, search, detail panel, add mock signal
- **Sidebar** — Signals nav entry
- **Command bar** — `Signals` navigation action

## Mock seeds (first load)

1. Calendar — Economics study block tomorrow
2. Health — 7.5 hours sleep
3. Cursor — 2 hour FounderOS coding session
4. Health — workout not logged today
5. Email — important school reminder
6. Manual — FounderOS voice assistant idea

## Adding a real source later

1. Add adapter in `signalSources.ts` (e.g. `buildSignalFromGoogleCalendarEvent`)
2. Call `ingestSignal()` from a sync job or webhook handler
3. Optionally extend `signalClassifier` for source-specific rules
4. No changes required to storage, UI, or morning/evening consumers

## Known limitations

- No live OAuth or API polling
- Classifier is rule-based, not ML
- Duplicate capture → signal pairs possible if capture is retried
- Signal search is substring match, not semantic
- Knowledge auto-creation from mattered signals is a hint only (manual save in Knowledge Engine)

## Recommended next milestone

**Source adapters + sync scheduler** — Google Calendar read-only, Apple Health export import, GitHub/Cursor activity webhooks, with a `SignalSyncContext` and connection settings in `/settings`. Follow with **Kernel** event bus once multiple sources emit concurrently.
