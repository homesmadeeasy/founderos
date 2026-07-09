# FounderOS Home v1

## Why Home exists

FounderOS was accumulating powerful engines — memory, signals, decisions, domains, outcomes — but the experience still felt like a dashboard. Users had to know where to look and which screen to open.

**Home** answers one question immediately: *What matters right now?*

It is not a new engine. It is a composition layer that reads live data from every existing system and presents it as a calm, premium daily surface — the place you begin and end each day.

## Design philosophy

Home follows a few non-negotiable principles:

1. **Calm confidence** — large typography, generous spacing, glass surfaces, soft shadows. Think Apple, Linear, Arc, Nothing OS — not Notion, ClickUp, or Jira.
2. **One timeline** — calendar, tasks, workouts, study, meetings, and recommendations merge into a single chronological view. No widget walls.
3. **Natural language** — the AI narrative reads like a Chief of Staff, not bullet lists or engine output.
4. **Hide implementation** — users see intelligence, not kernel names, internal IDs, or database views.
5. **Always-on worthy** — every section should pass the test: *Would someone want to leave this open on their computer all day?*

## How Home differs from dashboards

| Traditional dashboard | FounderOS Home |
|----------------------|----------------|
| Many widgets and tables | One vertical story |
| Static metrics | Live narrative from engines |
| User navigates to insight | Insight comes to the user |
| Technical labels | Human language |
| Competing priorities | One mission, one decision, one focus |

The old `/dashboard` route now redirects to `/home`. Dashboard was a debug-oriented command center; Home is the product surface.

## Architecture

Home is **read-only composition**. Components live in `components/home/` and pull from existing contexts:

- `CommandCenterContext` — mission, assistant, daily log
- `MorningExecutionContext` — plan, decision, domain intelligence
- `SignalEngineContext` — today's signals
- `MemoryEngineContext` — recent memories
- `KnowledgeEngineContext` — principles and lessons
- `SyncEngineContext` — calendar connection status
- `UniversalCaptureContext` — capture actions

Utility logic is in `lib/home/homeUtils.ts` (narrative, recovery, success probability) and `lib/home/homeTimeline.ts` (unified timeline builder).

No new state is duplicated. Editing the mission writes through existing `setMission` and `updatePrimaryMission` paths.

## Sections

| Section | Purpose |
|---------|---------|
| **Hero** | Greeting, time, date, recovery, success probability |
| **Mission** | One editable sentence — the day's north star |
| **Narrative** | Chief-of-staff prose from health, domains, decision |
| **Today timeline** | Unified chronological items |
| **Focus** | Current focus with Begin, capture, ask |
| **Domain snapshot** | Horizontal cards for six life domains |
| **Connected reality** | Latest five signals |
| **Recent learning** | Memories, knowledge, outcomes |
| **Today's decision** | Recommendation with evidence and Begin |
| **Quick actions dock** | Floating capture / ask / focus shortcuts |
| **Status footer** | Subtle system health dots |

## Routing

- `/home` — default landing after login and onboarding
- `/dashboard` — redirects to `/home`
- Sidebar: Home, Capture (button), Morning, Evening, Domains, Objects, Memory, Knowledge, Executive, Settings

## Assistant

The assistant understands Home-native phrases:

- **"Go Home"** — navigates to `/home`
- **"What matters?"** — mission, narrative, decision, signals
- **"Summarise today"** — timeline and learning digest
- **"What changed?"** — existing kernel change summary (unchanged)

## Future roadmap

- **Focus Mode** — full-screen focus with countdown timer (Focus card links to `/morning` for now)
- **Live weather** — replace placeholder with a weather adapter
- **Mobile-first polish** — Home is designed to become the primary mobile screen
- **Personalised narrative** — LLM-generated prose via Edge Function instead of template composition
- **Timeline drag-and-drop** — reorder or reschedule from Home
- **Ambient animations** — subtle time-of-day gradients and parallax on scroll

## Acceptance

- Build passes
- Home is default page; dashboard redirects
- Mission editable; narrative generated from live data
- Timeline unified; domains, decision, signals, memories live
- Premium aesthetic — no clutter, no engine terminology in the UI
