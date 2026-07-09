# Evening Review + Daily Learning Loop

FounderOS vertical slice that closes the daily cycle: the system learns from today and improves tomorrow's Morning Execution.

## Purpose

FounderOS is not only where the user talks to AI — it is where AI interacts with the user's life. The evening slice captures what happened, writes durable memories, suggests knowledge, and prepares tomorrow's context.

## Daily loop architecture

```
Morning Plan → Execution → Evening Review → Memory → Knowledge Suggestions → Tomorrow Context
```

| Stage | Route / module | Output |
|-------|----------------|--------|
| Morning Plan | `/morning`, `lib/morning-execution/` | Priorities, mission, schedule |
| Execution | Command Center, task/object engines | Day activity |
| Evening Review | `/evening`, `lib/evening-review/` | Wins, blockers, lessons, reflection |
| Memory writeback | `eveningLearning.ts` | Memory records on completion |
| Knowledge suggestions | `learningExtraction.ts` | Rule-based principles from lessons |
| Tomorrow context | `tomorrowContext.ts` | Carry-over priorities, warnings, focus |

## Modules

### Evening Review (`lib/evening-review/`)

- **eveningTypes.ts** — `EveningReview` type and store shapes
- **eveningStorage.ts** — localStorage key `founderos-evening-review-v1`
- **eveningReview.ts** — draft building, priority sync, list helpers
- **eveningLearning.ts** — memory inputs on completion (deduped per date)
- **eveningUtils.ts** — IDs and date helpers

### Daily Learning Loop (`lib/daily-learning-loop/`)

- **dailyLoop.ts** — `generateDailyLearningLoop()` compares morning vs evening
- **learningExtraction.ts** — rule-based lesson → knowledge suggestions
- **tomorrowContext.ts** — localStorage key `founderos-tomorrow-context-v1`
- **dailyLoopTypes.ts** — loop output and tomorrow context types

### Context & UI

- **EveningReviewContext** — review state, completion, learning loop, knowledge save
- **`/evening`** — full review UI
- **EveningReviewCard** — Command Center status + link

## Memory writeback

When the user completes an evening review (once per date):

1. **Evening Review Completed** — `type: review`, `importance: high`, `source: system`
2. **Win memories** — `type: reflection`, `importance: medium`
3. **Blocker memories** — `type: insight`, `importance: high`
4. **Lesson memories** — `type: learning`, `importance: high`

Dedupe tags: `evening-review:{date}`, `dedupe:evening-review-{date}`. Re-completing does not duplicate writes.

## Knowledge suggestions

Lessons trigger rule-based suggestions (e.g. training overload → "Protect training energy"). Suggestions are shown on `/evening` with **Save as knowledge** — they are not auto-saved. Uses `createKnowledge` from Knowledge Engine with `source: review`.

## Tomorrow context

Generated on review completion from:

- Incomplete priorities
- Blockers and lessons
- Tomorrow notes and reflection
- Executive warnings

Stored for the **next calendar day**. Morning Execution reads `getTomorrowContextData(today)` when generating reasoning and plan:

- Carry-over priorities prepended to plan
- Warnings merged into morning plan
- `suggestedFocus` and `recommendedMission` influence primary focus

## Assistant integration

Supported prompts:

- "Review my day."
- "What did I learn today?"
- "What should I carry into tomorrow?"
- "What blockers did I have?"
- "Close the loop."

If no review exists, user is directed to `/evening`.

## Known limitations

- **Rule-based only** — no OpenAI summarisation or extraction yet
- **localStorage** — not synced across devices; no Supabase migration
- **No calendar/task sync** — priority completion is manual in evening review
- **Morning plan cache** — existing plan for today is not regenerated until user taps Regenerate
- **Knowledge patterns** — limited keyword rules in `learningExtraction.ts`

## Future OpenAI integration

- Natural-language reflection summarisation
- Richer lesson → principle extraction
- Personalized tomorrow mission drafting
- Cross-day pattern detection (energy, blockers)

## Future calendar / task completion sync

- Auto-mark priorities from completed tasks/events
- Pull blockers from stalled objects
- Bi-directional sync with external calendars

## Testing checklist

1. Open `/evening` — review draft loads from morning plan priorities
2. Toggle priorities, add wins/blockers/lessons, save reflection
3. Refresh — state persists
4. Complete review — memories appear in Memory Engine
5. Lesson with training/overload text — knowledge suggestion appears; save manually
6. Next day (or inspect `founderos-tomorrow-context-v1`) — tomorrow context exists
7. Regenerate morning plan — carry-over priorities and warnings appear
8. Dashboard — Evening Review card shows pending/completed
9. Assistant — daily loop prompts return useful answers
10. Existing routes (`/dashboard`, `/morning`, engines) still work
