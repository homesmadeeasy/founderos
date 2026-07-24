# Gym AI Context

How Gym AI receives personal context through the **Intelligence Pipeline**.

## Before (fragmented)

```
GymConversationCard
  → Identity hints (prefix only)
  → Reality hints (prefix only)
  → answerGymQuestion(snapshot)   // plan from GymSnapshot only
```

Identity/Reality did not structure the answer; GymProfile was not mirrored to Identity.

## After (canonical)

```
User: “What should I train today?”
  → IntelligencePipeline.run({ specialist: 'gym', intent: 'train_today' })
      ← Identity declared + observed
      ← Reality snapshot summaries
      ← Memory / beliefs (when present)
      ← Gym domain evidence from GymSnapshot (plan, recovery, history, equipment, injuries)
  → answerGymWithIntelligence(snapshot, message, partial)
  → User response (no developer traces)
  → optional Identity observation hook
```

## What the answer must include

- Declared profile facts used
- Observed patterns (distinct; never overwrite declared)
- Current plan from GymSnapshot (authoritative)
- Explicit missing information
- One high-value follow-up when useful
- Confidence / readiness note when evidence is thin

## What it must never do

- Invent workouts, injuries, sleep, recovery scores, or completed sets
- Present inferences as declared facts
- Dump IntelligenceTrace into the user-facing reply

## Key files

- `components/gym/GymConversationCard.tsx`
- `lib/specialists/gym/gymIntelligence.ts`
- `lib/specialists/gym/gymIdentityBootstrap.ts`
- `lib/intelligence-pipeline/*`
