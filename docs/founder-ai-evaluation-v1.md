# Founder AI Intelligence Evaluation v1

FounderOS v1 evaluation layer measures whether Founder AI, the cognitive model, reality reconciliation, conversation engine, decision engine, and founder specialist behave more intelligently and reliably over time — without adding a new major engine.

## Philosophy

- **Production paths only** — scenarios run through `reconcileUserEvidence`, `buildDeterministicFounderAIResponse`, `buildFounderSnapshot`, `answerCognitiveQuery`, and related modules. No parallel test-only reasoning.
- **Structural assertions** — beliefs, predicates, confidence bands, bottlenecks, recommendation intent, contradictions, evidence IDs, and persistence hashes — not exact prose matching.
- **Multi-turn behaviour** — each scenario defines initial world state and a sequence of user messages (or cognitive queries).
- **Honest scoring** — overall score (0–100) plus nine separate dimensions so a high average cannot hide a critical safety failure.

## Scenario format

```typescript
interface EvaluationScenario {
  id: string
  title: string
  category: EvaluationCategory
  severity?: 'normal' | 'critical'
  initialState?: { store?: CognitiveStore; seedMessage?: string }
  turns: Array<{ userMessage: string; kind?: 'reconcile' | 'query' | 'repeat_previous' }>
  expected: EvaluationExpectations
}
```

Key expectation fields: `beliefs`, `bottleneck`, `recommendationIncludes`, `forbiddenClaimPhrases`, `persistAfterRefresh`, `idempotentOnFinalTurn`, `cognitiveQuery`, `uncertaintyInResponse`.

## Scoring dimensions

| Dimension | What it measures |
|-----------|------------------|
| Factual consistency | Active beliefs match reconciled reality |
| Belief updating | Corrections and new evidence change beliefs appropriately |
| Evidence grounding | Claims tied to evidence IDs and source classification |
| Uncertainty honesty | Low confidence / unknowns when evidence is weak |
| Recommendation relevance | Bottleneck and top recommendation reflect latest model |
| Question quality | Next question targets highest-value unknown |
| Persistence | Simulated refresh retains reconciled state |
| Idempotency | Duplicate inputs do not duplicate changes |
| Safety | No fabricated facts, forbidden phrases, or silent overwrites |

Critical failures (fabricated facts, lost corrections, silent contradiction overwrites, corrupted persistence) zero the affected dimension and cap scenario score.

## Critical failure rules

Scenarios marked `severity: 'critical'` must pass in CI. Failures involving:

- Fabricated user counts or testing claims
- Lost user corrections after refresh
- Duplicate evidence on repeated messages
- Stale validation bottleneck after five-tester evidence

…are tagged `critical` on assertions and emit `FounderEvaluationCriticalFailure` kernel events in the Evaluation Lab.

## Adding scenarios

1. Add a scenario object to `lib/evaluation/founder-ai/evaluationScenarios.ts`.
2. Prefer real user-message variants already supported by `claimExtraction.ts`.
3. Assert on predicates (e.g. `validation.users_tested`) and structural fields, not response wording.
4. Run `npm run test:founder-intelligence` locally.
5. If behaviour intentionally changes, update regression snapshot baselines via a passing run with `registerBaselines: true`.

## Deterministic vs LLM paths

- CI and default Evaluation Lab runs use **deterministic fallback** (`llmEnabled: false` / no API key).
- When LLM is enabled in development, structured LLM output still passes through `validateFounderAIResponse` and the same reconciliation boundary; the suite does not require OpenAI to pass.
- Scenario `llm-fallback-deterministic` asserts `usedDeterministicFallback: true`.

## Interpreting the score

- **80+** — Strong rule coverage on defined scenarios; not general intelligence.
- **60–79** — Mixed reliability; inspect failed dimensions before trusting Founder AI recommendations.
- **&lt;60** or any critical failure — Do not treat Founder AI as reliable for validation/positioning decisions.

Compare dimension scores, not only the overall number. A 90 overall with 0 safety means fabricated-claim risk.

## Commands

```bash
npm run test:founder-intelligence   # Full scenario suite + infrastructure checks
npm run test:founder-regression     # Same runner (snapshot stability included)
npm run test:providers              # Provider tree + CognitiveModel/useFounderInput cycle
npm run test:reality-model
npm run test:founder-ai
npm run test:cognitive
npm run test:conversation
```

## Evaluation Lab

Development route: `/evaluation`

- Run All / Run Failed / Reset Fixtures / Export Report
- Per-scenario: turns, beliefs, bottleneck, recommendation, traces (inputs and state transitions only)
- Settings → Reliability shows last score and link to the lab

## Storage

- Compact summaries only in `localStorage` (`founderos-founder-eval-summaries-v1`, max 5 entries).
- Full reports stay in memory or export as JSON — no fixture payloads or duplicated world models in storage.

## Baseline limitations

This milestone proves **rule coverage and reconciliation reliability** on scripted scenarios. It does **not** prove:

- General reasoning beyond extracted claim patterns
- Novel phrasing outside training-style variants
- LLM prose quality when the API is enabled
- Long-horizon memory across unrelated sessions
- External data verification

Passing scenarios demonstrate specific behaviours (e.g. five-tester positioning shift, idempotent repeats, correction persistence). The framework itself does not make Founder AI more intelligent — it makes reliability visible and regressions detectable.
