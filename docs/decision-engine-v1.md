# Decision Engine v1

FounderOS Decision Engine answers one question:

> Given everything FounderOS already knows, **what should the user do next**, **what should they ignore**, and **why**?

It computes from current state — no separate storage, no external APIs.

## Architecture

```
Objects + Memories + Knowledge + Signals
        + Morning Plan + Evening Review + Executive State
                          ↓
                   decide(input)
                          ↓
              DecisionOutput (primary, evidence, ignore, confidence)
```

**Module:** `lib/decision-engine/`

| File | Role |
|------|------|
| `decisionTypes.ts` | Core types |
| `decisionEngine.ts` | `decide()` — candidate gathering + orchestration |
| `decisionScoring.ts` | Weighted scoring model |
| `decisionEvidence.ts` | Evidence chains + confidence |
| `decisionConflicts.ts` | Conflict detection + ignore list |
| `decisionExplanations.ts` | Human-readable explanation |
| `decisionUtils.ts` | Helpers |

## Main API

```typescript
decide(input: DecisionInput): DecisionOutput
```

### DecisionInput
- `objects`, `memories`, `knowledge`, `signals`
- `morningPlan`, `eveningReview`, `executiveState`
- `currentTime`
- Optional: `reasoningOutput`, `unresolvedCaptureCount`

### DecisionOutput
- `primaryDecision` — ranked top action
- `secondaryDecisions` — next 3 alternatives
- `ignoreToday` — explicit defer/ignore recommendations
- `evidence` — supporting/conflicting evidence chain
- `confidence` (0–100) + `confidenceLabel`
- `explanation` — specific prose summary
- `tradeoffs`, `risks`, `opportunities`

## Scoring model

```
score =
  importance + urgency + strategicAlignment + timeSensitivity
  + riskReduction + momentum + healthImpact + deadlinePressure
  - overloadPenalty - conflictPenalty - lowConfidencePenalty
```

### Heuristics
- Exam/study/calendar deadlines → higher urgency
- Low sleep → recovery priority, workout conflict penalty
- Workout gap signals → health priority
- FounderOS coding momentum → systems priority (unless study pressure)
- Capture pile (5+) → inbox processing priority
- Stalled projects → blocker priority
- Evening incomplete priorities → carry-forward boost
- Knowledge principles → strategic alignment

## Candidate sources

- Morning plan priorities
- Executive recommendations
- Open/overdue tasks
- Active projects (FounderOS, stalled blockers)
- Calendar/study/workout signals
- Coding session signals
- Recovery (low sleep)
- Inbox processing
- Knowledge principles
- Evening carry-forward

## Integration points

| Surface | What shows |
|---------|------------|
| `/morning` | Today's Decision section — action, confidence, evidence, ignore, tradeoffs |
| `/dashboard` | Today's Decision card |
| Assistant | "What should I do next?", focus, ignore, why, tradeoffs, FounderOS vs study, train vs recover |

Computed in `MorningExecutionContext` via `useMemo` — always reflects current engine state.

## Test scenarios

### Scenario 1: Exam tomorrow + FounderOS momentum + workout skipped
**Setup:** Mock calendar with study block tomorrow, coding session signal, workout-not-logged signal.

**Expected:** Study priority likely wins; workout secondary; FounderOS deferred to ignore list.

### Scenario 2: Good sleep + no calendar pressure + active FounderOS task
**Setup:** Health score ≥ 70, no study signals, FounderOS project with recent memories.

**Expected:** FounderOS deep work wins primary decision.

### Scenario 3: Low sleep + workout planned
**Setup:** Sleep < 6.5h in health log, gym calendar signal.

**Expected:** Recovery wins or train-vs-recover tradeoff recommends recovery.

### Scenario 4: Many captures + no implementation
**Setup:** 8+ inbox captures, no coding signals.

**Expected:** Process inbox or implementation tradeoff; ignore speculative ideas.

## How to test manually

1. `npm run build` — must pass
2. Open `/dashboard` — Today's Decision card with primary action + confidence
3. Open `/morning` — Today's Decision section below Morning Plan
4. Ask assistant:
   - "What should I do next?"
   - "What should I ignore today?"
   - "Why is this the priority?"
   - "Should I work on FounderOS or study?"
5. Connect mock calendar + sync — verify study blocks influence decision
6. Add 6+ captures — verify inbox processing rises in priority

## Known limitations

- Heuristic scoring only — no LLM reasoning
- Recomputes on every context change (no persistence of past decisions)
- Candidate deduplication by title only
- Tradeoff detection covers common patterns, not all edge cases
- Confidence is evidence-weighted, not calibrated against outcomes
- No user override / feedback loop yet

## Recommended next milestone

**Decision feedback loop** — let users accept/reject decisions in evening review, persist outcomes, and tune scoring weights from completed vs ignored decisions.
