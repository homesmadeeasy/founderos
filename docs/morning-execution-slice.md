# Morning Execution Slice

## What it is

The Morning Execution Slice is FounderOS's **first vertical slice** — a flow that connects existing engines into one morning workflow instead of isolated pages.

When you open FounderOS in the morning, the system:

1. **Builds Daily Context** from Objects, Memories, Knowledge, and Executive data
2. **Reasons** over that context to determine what matters and why
3. **Generates a Morning Execution Plan** with priorities, schedule blocks, and defer list
4. **Surfaces the plan** in Command Center and at `/morning`

## Architecture flow

```
Reality
  → Object Engine
  → Memory Engine
  → Knowledge Engine
  → Context Builder        ← compiles DailyContext
  → Reasoning Engine       ← interprets context
  → Executive Engine       ← feeds recommendations
  → Morning Execution      ← produces actionable plan
  → Interface (Dashboard + /morning)
```

## Why vertical slices

Engine-only sprints (Sprints 2–6) built durable layers. Vertical slices **connect** those layers into user-facing flows:

| Engine-only | Vertical slice |
|-------------|----------------|
| Data in siloed pages | Data flows through pipeline |
| User connects dots manually | System compiles and reasons |
| Features exist | Workflows exist |

Future slices: Evening Review, Weekly Planning, Project Kickoff.

## Components

### Context Builder (`lib/context-builder/`)

`buildDailyContext()` produces a `DailyContext` with mission, projects, tasks, memories, knowledge, executive recommendations, health signals, blockers, and opportunities.

Stored in `founderos-daily-context-v1`.

### Reasoning Engine (`lib/reasoning-engine/`)

`generateDailyReasoning(context)` answers:
- What matters most today?
- Why does it matter?
- What should be deferred?
- What risks exist?

Stored in `founderos-reasoning-engine-v1`.

### Morning Execution (`lib/morning-execution/`)

`generateMorningExecutionPlan()` produces schedule blocks (Deep Work, Health, Learning, Admin, Recovery) and top priorities.

Stored in `founderos-morning-execution-v1`.

## Memory writeback

When a morning plan is generated, one `review` memory is written per day:

- Title: "Morning execution plan generated"
- Source: `system`
- Dedupe tag: `morning-plan:{date}`

Regenerating manually creates a new memory (user-initiated).

## Command Center integration

The **Morning Execution Briefing** card appears above the legacy Daily Briefing. It shows mission, top 3 priorities, warnings, defer list, and recommended first action.

Existing dashboard cards are unchanged.

## Known limitations

- Rule-based reasoning (no OpenAI)
- localStorage only
- Schedule blocks are labels, not real calendar events
- No automatic mission sync with Command Center mission field
- Regenerate on assistant ask may not return plan in same turn
- Context rebuilds from snapshot — not live-subscribed to every engine change until regenerate

## Future: OpenAI integration

- LLM-generated reasoning narratives from full context window
- Personalized schedule block timing
- Natural-language plan edits

## Future: Calendar integration

- Push schedule blocks to Google Calendar
- Respect existing meetings when planning deep work

## Recommended next slice

**Evening Review Slice** — close the day loop: summarize what happened, update memories, extract knowledge candidates, and prep tomorrow's context.
