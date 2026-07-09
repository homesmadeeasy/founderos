# Source Adapters + Sync Engine

FounderOS **Source Adapters** and **Sync Engine** prepare the app for real-world connections without OAuth or paid APIs yet. Everything runs **local-first** in the browser.

## Architecture

```
Settings (Connect mock) ──► adapterRegistry ──► syncRunner.runSync()
                                                      │
Mock adapter.sync() ──► CreateSignalInput[] ──► signalPipeline.ingestSignal()
                                                      │
                                              Signal Engine (localStorage)
                                                      │
                    ┌─────────────────────────────────┼─────────────────────┐
                    ▼                                 ▼                     ▼
              Morning notes                    Evening review           Assistant Q&A
```

## Source adapters (`lib/source-adapters/`)

Each adapter implements:

| Field | Purpose |
|-------|---------|
| `id` | Registry key (`calendar`, `health`, `cursor`, …) |
| `name` | Display label |
| `source` | `SignalSource` for ingested signals |
| `status` | `disconnected` \| `connected` \| `error` \| `mock` |
| `lastSyncedAt` | From sync storage |
| `sync()` | Returns mock `CreateSignalInput[]` |
| `testConnection()` | Validates mock/connected state |

### Mock adapters (current)

| Adapter | Example signals |
|---------|-----------------|
| Calendar | Study block today, gym tomorrow, assignment due |
| Health | Sleep duration, workout gap, energy window |
| GitHub | Commit, PR review |
| Cursor | Coding session, files changed, build fixed |
| Email | School reminder, finance, calendar invite |
| Files | Notes/docs updated |
| Voice | Capture placeholder |
| Watch | Activity rings, steps |

Connection state is stored in `founderos-sync-engine-v1` (not real OAuth tokens).

## Sync engine (`lib/sync-engine/`)

### SyncJob

- `id`, `adapterId`, `source`, `status`, `startedAt`, `completedAt`
- `signalsCreated`, `error`

### Functions

| Function | Behavior |
|----------|----------|
| `runSync(adapterId)` | Test connection → adapter.sync() → ingest signals → record job |
| `runAllSyncs()` | Sync all mock/connected adapters |
| `getSyncHistory()` | Recent jobs |
| `getLastSyncForSource(source)` | Last completed job per source |
| `scheduleMockSync()` | One-shot `runAllSyncs` (scheduler placeholder) |

### Deduping

Signals include `metadata.syncKey`. Re-sync within 24h skips duplicate keys.

## UI integration

### Settings → Connected Sources

- Connect mock / Disconnect / Sync per adapter
- GitHub and Cursor shown as separate controls under one card

### `/signals`

- Source connection status chips
- **Sync all sources** button
- Last global sync time
- Sync history panel
- Synced signals tagged in list

### Morning / Evening

- Morning uses synced signals via existing `buildMorningSignalNotes` (low sleep → reduce intensity, etc.)
- Evening shows **Today's Synced Signals** with mattered / ignore / convert to memory

### Assistant

- What sources are connected?
- When did signals last sync?
- What is on my calendar?
- **Sync my signals** → runs `syncAll()` then responds

## Mock mode vs future OAuth

| Today (mock) | Future |
|--------------|--------|
| `connectMock()` sets status `mock` | OAuth flow sets `connected` |
| `adapter.sync()` returns hardcoded inputs | Adapter calls Google/Apple/GitHub APIs |
| No network, no secrets | Tokens in secure storage / Supabase |
| Same ingest path | Same `runSync` → `ingestSignal` path |

Planned integrations: Google Calendar, Apple Health export, GitHub webhooks, Gmail read-only, Cursor activity API.

## How signals enter FounderOS

1. User connects mock source in Settings
2. User taps Sync (or Sync all on `/signals`)
3. `syncRunner` calls adapter, ingests via `ingestSignal`
4. Optional auto-memory for important signal types
5. Morning/Evening/Assistant read from Signal Engine state

Universal Capture remains separate — manual captures still create `manual_capture` signals.

## Known limitations

- No real OAuth or API polling
- Mock data is deterministic per adapter
- 24h dedupe may hide intentional re-sync of same key
- Scheduler is one-shot only (no background cron)
- Command Center assistant sync only on dashboard (where `CommandCenterProvider` lives)

## Recommended next milestone

**OAuth + first live adapter** — Google Calendar read-only as the first real source, with token storage in Settings and a `SyncScheduler` interval hook. Then Apple Health import and GitHub activity.
