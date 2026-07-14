# Cognitive Model — Founder AI's Internal Mind

FounderOS now maintains a **persistent Cognitive Model** above Memory, Knowledge, Objects, Signals, Domain Intelligence, Decision Engine, Outcome Engine, Conversation, and the Founder Kernel. This layer does not replace those systems — it consumes them as **evidence sources** and maintains an evolving **World Model** of the user and their reality.

## Architecture

```
lib/cognitive-model/
├── beliefTypes.ts        # Beliefs, hypotheses, unknowns, world model types
├── beliefStorage.ts      # localStorage persistence
├── beliefEvidence.ts     # Evidence from memories, signals, outcomes, knowledge
├── beliefConfidence.ts   # Confidence scoring and status derivation
├── beliefHypotheses.ts   # Hypothesis generation and testing
├── beliefQuestions.ts    # Highest-value uncertainty-reduction questions
├── beliefUpdates.ts      # Belief updates with full history (never silent overwrite)
├── beliefContradictions.ts
├── beliefTimeline.ts
├── worldModel.ts         # Single persistent World Model
├── cognitiveSummary.ts   # Insight cards and assistant responses
├── cognitiveUtils.ts
├── cognitiveOrchestrator.ts  # Sync + kernel + conversation processing
├── cognitiveConversation.ts  # Belief-centric conversation reasoner
├── cognitiveDecision.ts      # World Model → Decision Engine bridge
└── cognitiveAssistant.ts     # Belief query handlers
```

## Belief lifecycle

Every belief contains: `id`, `topic`, `statement`, `confidence` (0–100), `status` (confirmed | likely | possible | unknown | contradicted), `importance`, `source`, timestamps, `supportingEvidence`, `contradictingEvidence`, and `history`.

Flow: **Belief → Question → User Answer → Belief Update → New Question**

## World Model dimensions

Vision, Mission, Values, Current Stage, Momentum, Execution, Validation, Health, Learning, Relationships, Finance, Unknowns, Open Questions, Current Risks, Current Hypotheses, Current Bottlenecks, Confidence Levels.

## Integration points

| System | Integration |
|--------|-------------|
| **Kernel** | `CognitiveModelUpdated` event; subscriber on Memory, Signal, Outcome, Knowledge, Decision, Conversation |
| **Conversation** | `createCognitiveReasoner()` via `setConversationReasoner()` |
| **Decision Engine** | Optional `worldModel` on `DecisionInput`; scoring boost for validation when beliefs are uncertain |
| **Home** | `CognitiveInsightCard` — Current Belief, Biggest Unknown, Highest Risk, Top Question |
| **Assistant** | Matchers for belief, evidence, uncertainty, hypothesis queries |

## Normalization boundary

All engine/provider data enters through `normalizeCognitiveInput()` in `cognitiveInputNormalize.ts`. This guarantees every collection field is a real array (via `Array.isArray()`), applies per-engine adapters (`adaptMemoryRecord`, `adaptSignalRecord`, `adaptOutcomeRecord`, `adaptKnowledgeRecord`), and produces a fully required `NormalizedCognitiveInput` for internal processing.

Persisted cognitive state is normalized on load via `normalizeCognitiveStore()` / `normalizeWorldModel()`.

`CognitiveModelProvider` waits for engine readiness flags, reconciles only when the input fingerprint changes, and defers empty reconciles when persisted beliefs exist (`shouldDeferEmptyReconcile`).

## Epistemic language

Founder AI uses phrases like: "I think...", "I'm not certain...", "My confidence has increased because...", "This contradicts what I believed yesterday.", "I've changed my mind based on new evidence.", "I don't yet have enough information.", "Can I test a hypothesis?"

## Future specialists

Gym, School, Finance, Health, Relationships, Career specialists will share the same World Model rather than isolated memories. The cognitive layer is modular and invisible — no new dashboard.
