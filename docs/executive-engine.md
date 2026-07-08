# FounderOS Executive Engine

## What it is

The Executive Engine is FounderOS Layer 3 — the **priority and decision layer**. It answers:

| Layer | Question |
|-------|----------|
| Object Engine | What exists? |
| Memory Engine | What happened? |
| **Executive Engine** | **What matters next?** |

Sprint 5 implements this as **local-first** storage (`founderos-executive-engine-v1`), reading from Object Engine, Memory Engine, and Command Center state.

## Architecture

```
Reality
  → Object Engine (structured entities)
    → Memory Engine (historical context)
      → Executive Engine (priorities & decisions)
        → Domain Intelligence (future)
          → Interface (Command Center, /executive)
```

The Executive Engine does not replace lower layers — it **synthesizes** them into briefings, attention scores, recommendations, and conflict warnings.

## Core concepts

### Executive Context

Built by `createExecutiveContext()` from:

- All objects and memories
- Command Center state (mission, tasks, projects, health logs, captures)
- Derived: active goals/projects, open tasks, recent memories/decisions, blockers, health signals

### Attention Scoring

Each scorable object (tasks, projects, goals, habits) receives six sub-scores (0–100):

- **Urgency** — due dates, overdue status
- **Importance** — priority, goal support, strategic centrality
- **Strategic value** — FounderOS and systems work score highest
- **Risk** — blockers, school deadlines, poor health
- **Momentum** — recent memories linked to the object
- **Energy fit** — health signals vs workload intensity

Weighted total produces a ranked attention queue.

### Conflict Resolution

`resolveExecutiveConflicts()` detects:

- Too many high-priority tasks
- Health/recovery vs intense workload
- School deadlines vs FounderOS deep work
- Long-term goals without supporting tasks
- Active projects with no next action

Returns **warnings** and **tradeoff notes**.

### Recommendations

`generateExecutiveRecommendations()` produces 3–5 items:

1. Primary focus
2. Secondary focus
3. Health action (if signals are weak)
4. Project action
5. Defer/ignore suggestion

Every recommendation includes a **rationale**.

### Daily Briefing

`generateDailyExecutiveBriefing()` combines priorities, warnings, opportunities, and recommendations into a daily executive summary grounded in objects and memories.

## Storage

`founderos-executive-engine-v1` stores:

- Recent briefings (14 max)
- Recommendations history (30 max)
- Decision console answers (50 max)

Briefings are auto-saved once per day; use **Regenerate briefing** to refresh.

## UI — `/executive`

Sections:

- Daily Executive Briefing
- Top Focus
- Attention Scores (bar chart)
- Recommendations with rationales
- Warnings / Conflicts
- Decision Console (rule-based Q&A)

## Command Center integration

The dashboard assistant uses Executive Engine **first** for:

- "What should I focus on today?"
- Blocker/warning questions (when executive warnings exist)

Falls back to legacy Command Center briefing if Executive Engine is not ready.

## Daily loop

1. Set mission in Command Center
2. Log health snapshot
3. Work objects/tasks (auto-memories flow up)
4. Open `/executive` for briefing and top focus
5. Use Decision Console for quick executive answers

## Weekly loop (manual for now)

1. Review stored briefings in localStorage
2. Check neglected goals via warnings
3. Regenerate briefing after weekly review
4. Record decisions in Decision Console

## Future: OpenAI integration

Planned upgrades:

- LLM-generated rationales from full context window
- Natural-language tradeoff negotiation
- Personalized attention weight tuning
- Cross-domain intelligence (health coach, school planner, founder advisor)

The React context API and type shapes are designed so `recommendationEngine.ts` and `briefingEngine.ts` can swap rule-based logic for LLM calls without UI changes.

## Future: Domain AI

Executive Engine will route to domain-specific reasoning:

- **Health domain** — recovery vs training load
- **Knowledge domain** — school deadlines and study blocks
- **Systems domain** — FounderOS product priorities

Sprint 5 uses unified scoring; domain routers come in Sprint 6+.

## Known limitations

- localStorage only — not synced across devices
- Rule-based scoring, not ML or LLM
- Command Center state read from storage (not live subscription)
- No calendar/scheduling integration
- Weekly briefings not auto-generated (daily only)
- Supabase Worlds/Goals not yet feeding Executive Engine
- Does not auto-execute actions — recommends only

## Sprint 6 recommendation

Build the **Reasoning Engine** — connect memories + objects + executive context into deeper "why" analysis, hypothesis tracking, and structured decision records that feed back into Memory Engine automatically.
