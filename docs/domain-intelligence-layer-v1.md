# Domain Intelligence Layer v1

## Why domains exist

FounderOS was treating life as one flat priority list. School deadlines, gym habits, FounderOS builds, inbox hygiene, and relationships all competed in the same scoring bucket.

**Domain Intelligence Layer v1** gives FounderOS multiple **domain lenses** — one brain, separate evaluations — then coordinates them into a balanced global recommendation.

## Domains vs agents

This is **not** multiple AI bots or agents. There is:

- One FounderOS brain
- Seven domain evaluators (rule-based heuristics)
- One global coordinator

Each domain reads the same underlying state (objects, memories, knowledge, signals, outcomes) through its own filter. No duplicate storage, no separate bots.

## Domain registry

| Domain ID | Name | Goal |
|-----------|------|------|
| `founder` | Founder | Build valuable software without destroying school/health |
| `school` | School | Protect academic performance and future optionality |
| `health` | Health | Maintain physical and mental performance |
| `finance` | Finance | Improve financial capability, reduce avoidable risk |
| `relationships` | Relationships | Protect important relationships and communication |
| `personal_growth` | Personal Growth | Compound skill, maturity, self-awareness |
| `systems` | Systems | Keep the operating system clean and usable |

Definitions live in `lib/domain-intelligence/domainRegistry.ts` with keywords, object areas, signal types, and knowledge domain mappings.

## Evaluation logic

For each domain, `evaluateDomain()`:

1. **Filters** relevant objects, memories, knowledge, signals, outcomes, and morning priorities
2. **Scores** current status (0–100) using domain-specific heuristics
3. **Detects risks** (e.g. low sleep, capture backlog, study deadlines)
4. **Detects opportunities** (e.g. coding momentum, clear inbox)
5. **Generates** recommendation and next action
6. **Attaches evidence** from filtered sources
7. **Calculates confidence** from evidence density

Status: `excellent | good | needs_attention | at_risk | unknown`  
Priority: `low | medium | high | critical`

## Coordinator logic

`coordinateDomains()` takes all evaluations and:

- Ranks domains by effective urgency (score inversion + priority + status + registry weight)
- Chooses **top domain** for today
- Identifies **neglected domains** (unknown or low evidence)
- Detects **conflicts** (e.g. school critical + founder high, health at risk + deep work)
- Produces **global recommendation** and **tradeoffs**
- Explains why one domain wins

### Example outputs

| Situation | Global recommendation |
|-----------|----------------------|
| School critical + Founder high | Protect school first, then FounderOS later |
| Health at risk | Reduce load and prioritise recovery |
| Systems neglected (inbox pile) | Clear inbox before adding more ideas |
| Founder high, school/health stable | Deep work on FounderOS |

## How Decision Engine uses domains

Decision Engine is **not replaced** — it is enhanced.

1. `MorningExecutionContext` computes `buildDomainIntelligence()` before `decide()`
2. `domainCoordinator` is passed into `DecisionInput`
3. `decisionScoring.ts` applies `applyDomainScoringBoost()`:
   - Top domain candidates get +15 bonus
   - Critical/high priority domain candidates get extra boost
   - Neglected domain candidates get +6
   - Conflicted lower-priority domains get penalty (e.g. founder when school is critical)

## Integration points

| Surface | What it shows |
|---------|---------------|
| `/morning` | Domain Snapshot — status per domain, top domain, conflicts |
| `/dashboard` | Domain Intelligence card — top domain, at-risk, neglected |
| `/domains` | Debug view — full evaluations, evidence, coordinator output |
| Assistant | Domain Q&A — health, school, founder, tradeoffs, neglect |

## Examples

**Morning decision influence:**
> "This decision is influenced by School being critical and Founder momentum."

**Assistant — school vs FounderOS:**
> School (needs_attention, score 52): Protect study blocks first.  
> Founder (good, score 68): Coding momentum detected.  
> Coordinator: Protect school first, then schedule FounderOS deep work.

## Limitations (v1)

- **Heuristic only** — keyword matching and rule-based scoring, not ML
- **No persistent domain store** — recomputed from existing state each morning
- **Relationships/finance** often `unknown` without explicit data
- **Founder vs systems split** relies on title/tag disambiguation
- **No time-series trends** — single-day snapshot only
- **Coordinator conflicts** are pattern-matched, not optimiser-based

## Future: specialist AI layer

A later milestone could add:

- Per-domain LLM analysis of evidence (without multiple chat bots)
- Trend detection across days (domain score history)
- Personalised domain weights learned from outcomes
- Proactive domain alerts via notifications
- Cross-domain optimisation (Pareto tradeoff solver)

## Core API

| Function | Purpose |
|----------|---------|
| `evaluateDomain(domain, input)` | Single domain evaluation |
| `evaluateAllDomains(input)` | All 7 domains |
| `coordinateDomains(evaluations)` | Global coordinator output |
| `buildDomainIntelligence(input)` | Full pipeline |

## How to test

1. `npm run build` — must pass
2. Open `/morning` — Domain Snapshot shows 7 domains with statuses
3. Open `/dashboard` — Domain Intelligence card shows top domain
4. Open `/domains` — debug evidence and coordinator output
5. Ask assistant: "What domain should win today?" / "How is my school domain?"
6. Verify Today's Decision changes when school signals or health risks are present
7. Confirm no duplicate renders or hydration errors on dashboard/morning

## Architecture

```
Objects + Memories + Knowledge + Signals + Outcomes + Morning/Evening
                    ↓
         Domain Intelligence Layer
                    ↓
    Domain Evaluators (×7) → Global Coordinator
                    ↓
         Decision Engine (scoring boost)
                    ↓
    Morning / Dashboard / Assistant
```
