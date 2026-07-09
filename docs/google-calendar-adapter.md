# Google Calendar Adapter (Read-Only)

FounderOS's first **live external source adapter**. Google Calendar events are fetched read-only and converted into **calendar signals** in the Signal Engine.

## Purpose

- Connect FounderOS to real schedule data without write access
- Turn calendar events into actionable signals for Morning, Evening, and the Assistant
- Keep mock calendar working as a fallback for development and demos

## Read-only design

- Scope: `calendar.readonly` only (future OAuth)
- No event creation, updates, or deletes
- API route: `GET /api/integrations/google-calendar/events`
- Server fetches from Google Calendar API v3 `events.list`

## Connection modes

| Mode | Description |
|------|-------------|
| **Mock** | `calendar` adapter — seeded study/gym/deadline events |
| **Manual token** | Paste a Google access token in Settings (developer testing) |
| **OAuth** | Prepared but not implemented — env vars documented for future plug-in |

If Google Calendar is not connected, the API returns:

```json
{ "ok": false, "error": "Google Calendar is not connected yet." }
```

The app never crashes when disconnected.

## Environment variables (optional)

Not required to run the app. Documented for future OAuth:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

When all three are set, `oauthPrepared: true` is returned from the events API.

## How events become signals

Each Google Calendar event maps to a `CreateSignalInput`:

| Field | Source |
|-------|--------|
| `source` | `calendar` |
| `type` | `event`, `task`, or `reminder` (inferred from title/content) |
| `title` | Event summary |
| `content` | Time range, location, description excerpt |
| `timestamp` | Event start time |
| `metadata.calendarEventId` | Google event ID |
| `metadata.start` / `end` | ISO start/end |
| `metadata.location` | Event location |
| `metadata.attendeesCount` | Number of attendees |
| `metadata.htmlLink` | Google Calendar link |
| `metadata.provider` | `google` |
| `metadata.syncKey` | `gcal:{eventId}` |

Mock calendar signals use `metadata.provider: 'mock'`.

## Dedupe strategy

Sync runner skips duplicates within 24 hours:

1. **Primary:** `metadata.syncKey` (e.g. `gcal:abc123`)
2. **Calendar-specific:** `metadata.calendarEventId`
3. **Fallback:** `title` + `start` time (first 16 chars)

## UI integration

- **Settings → Connected Sources:** Separate Mock Calendar and Google Calendar rows with status, mode, sync, and manual token input
- **/signals:** Shows provider label (Google Calendar vs Mock Calendar) and deterministic event time
- **Morning:** Study blocks, gym sessions, today/tomorrow events influence notes
- **Evening:** Today's calendar signals with mattered / ignore / convert to memory
- **Assistant:** Answers calendar questions; reports honest connection status

## Testing

1. Run app without Google env vars — should work normally
2. Settings → connect **Mock Calendar** → Sync → check `/signals`
3. Hit `GET /api/integrations/google-calendar/events` — expect disconnected JSON error
4. (Optional) Paste a read-only access token → Sync Google Calendar → verify `provider: 'google'` signals
5. Ask assistant: "What is on my calendar?" / "Is Google Calendar connected?"
6. `npm run build` passes

## Known limitations

- No full OAuth flow yet — manual token only for live testing
- Token stored in browser `localStorage` (not production-grade)
- No refresh token handling — token expiry requires re-entry
- Single calendar (`primary`) — no multi-calendar selection
- All-day events use date-only timestamps
- Dedupe window is 24 hours — older duplicates may re-ingest
- Read-only — cannot create or modify calendar events from FounderOS

## Recommended next milestone

**Google Calendar OAuth flow** — implement authorization code flow with refresh tokens, secure server-side token storage, and a "Connect with Google" button replacing manual token paste.
