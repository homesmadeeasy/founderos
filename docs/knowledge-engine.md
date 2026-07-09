# FounderOS Knowledge Engine

## What it is

The Knowledge Engine is FounderOS Layer 3 — the **durable principles layer**. It answers:

> What principle should guide future action?

Sprint 6 implements this as **local-first** storage (`founderos-knowledge-engine-v1`), sitting between Memory Engine and Executive Engine in the architecture.

## Architecture position

```
Reality
  → Object Engine (what exists?)
    → Memory Engine (what happened?)
      → Knowledge Engine (what should guide the future?)
        → Reasoning Engine (future — what does this mean?)
          → Executive Engine (what matters next?)
            → Domain Intelligence → Interface
```

## Objects vs Memories vs Knowledge

| Layer | Question | Example |
|-------|----------|---------|
| **Objects** | What exists? | Task: "Ship Object Engine" |
| **Memories** | What happened? | "Completed workout on Tuesday" |
| **Knowledge** | What should guide action? | "Health protects output" |

A memory is an event in time. Knowledge is a durable principle extracted from experience, reviews, or deliberate capture.

## Knowledge types

`principle`, `framework`, `rule`, `lesson`, `standard`, `playbook`, `checklist`, `model`, `sop`, `insight`

## Domains

`gym`, `school`, `founder`, `finance`, `health`, `work`, `life`, `systems`

Domains are **lenses**, not data silos. All knowledge links to shared objects and memories via `relatedObjectIds` and `relatedMemoryIds`.

## Seed knowledge

Seven seed principles ship on first load:

1. Build software, not endless plans
2. Object-first architecture
3. Memory is not knowledge
4. Daily Executive Focus
5. Health protects output
6. Exam period training
7. Domains do not own data

## Memories → Knowledge (with approval)

`memoryKnowledgeBridge.ts` suggests knowledge from memories but **never auto-creates**:

- **Decision** memories → principles
- **Reflection** memories → lessons
- **Review** memories → playbooks/checklists
- **Repeated health_log** memories → health rules

Users approve suggestions via "Save as knowledge" on `/knowledge`.

## Executive Engine integration

Executive Engine reads knowledge and selects relevant principles:

- **Daily Executive Focus** — always considered for primary focus
- **Object-first architecture** — founder/systems recommendations
- **Health protects output** — when health signals are weak
- **Exam period training** — when school pressure is detected

Briefings and recommendation rationales cite applicable principles.

## Future: Domain AIs

Domain intelligence (gym coach, school planner, founder advisor) will **read** from Knowledge Engine rather than storing separate rule sets:

- Gym domain → `gym` + `health` knowledge
- School domain → `school` knowledge
- Founder domain → `founder` + `systems` knowledge

## Future: OpenAI integration

Planned upgrades:

- LLM extraction of principles from memory batches
- Confidence scoring from evidence chains
- Automatic deduplication of similar principles
- Vector search over knowledge content

## Known limitations

- localStorage only — not synced across devices
- No vector embeddings
- Suggestions are rule-based, not LLM-extracted
- No automatic promotion from memory without user click
- Reasoning Engine (Sprint 7) not yet built
- Supabase Worlds/Goals not writing to Knowledge Engine

## Sprint 7 recommendation

Build the **Reasoning Engine** — interpret objects + memories + knowledge together to answer "what does this mean?", detect patterns, and produce structured hypotheses that feed Executive decisions.
