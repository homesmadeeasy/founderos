# FounderOS Intelligence Pipeline

**Canonical contract** for specialist AI. Orchestration only — does not replace Identity, Reality, Memory, Cognitive Model, Reasoning, Decision, Executive, Action, or Domain Intelligence.

See also: [INTELLIGENCE_SYSTEM_AUDIT.md](./INTELLIGENCE_SYSTEM_AUDIT.md)

Code: `lib/intelligence-pipeline/` · Context: `contexts/IntelligencePipelineContext.tsx` · Inspector: `/intelligence-inspector` (dev)

---

## Lifecycle

```
Request
  → specialist intent
  → declared profile
  → observed identity
  → current reality
  → relevant memories
  → beliefs / world model
  → specialist evidence
  → missing information
  → reasoning
  → bounded recommendation
  → explanation
  → response
  → approved post-response updates
```

### Responsibility assignment

| Stage | Owning system |
|-------|----------------|
| Declared / observed profile | **Identity Engine** |
| Current reality | **Reality Engine** (`lib/reality`) |
| Memories | **Memory Engine** (keyword; vector later) |
| Beliefs | **Cognitive / World Model** |
| Specialist evidence (Gym) | **Gym snapshot / planner** via adapter |
| Daily reasoning / decision summaries | **Reasoning / Decision** (morning outputs, read-only) |
| Recommendations titles | **Executive** (read-only) |
| Mutations | **Identity / Reality / Memory / Action** via explicit hooks only |
| Orchestration + trace | **Intelligence Pipeline** (thin) |

---

## Contracts

### `IntelligenceRequest`

`requestId`, `userId?`, `specialist`, `intent?`, `userMessage`, `conversationId?`, `timestamp?`, `permittedDataScopes?`, `readOnly?`

### `IntelligenceContext`

`declaredProfile`, `observedIdentity`, `realitySnapshot`, `relevantMemories`, `relevantBeliefs`, `domainEvidence`, `goals`, `constraints`, `dataFreshness`, `missingInformation`, `readiness?`, `followUpQuestion?`

### `IntelligenceResult`

`responseContext`, `recommendations`, `evidence`, `confidence`, `explanation`, `missingInformation`, `warnings`, `proposedUpdates`, `trace`, `response` (+ legacy summary fields for compatibility)

### `IntelligenceTrace`

`requestId`, `stages`, `sourceSystemsUsed`, `recordsRetrieved`, `duration`, `skippedStages`, `degradedStages`, `warnings`, `final confidence`, `sanitizedReport` (privacy-safe)

---

## Gym reference integration

1. Gym onboarding saves **GymProfile** (planner SOT) and mirrors declared facts into **Identity**.
2. `GymConversationCard` asks via `useIntelligencePipeline().run()`.
3. Adapter `collectGymDomainEvidence(snapshot)` supplies plan, recovery, history, equipment, injuries.
4. `answerGymWithIntelligence` renders known facts vs observed vs missing — never invents history.
5. Inspector shows stages and context used.

Readiness: `not_ready` → `minimum_ready` → `personalized` → `evidence_rich`. Gym works at **minimum_ready**.

---

## Deprecated flows

- Specialist manually fan-out Identity + Reality + Memory for answers
- Treating cognitive belief “Reality” as the live operating snapshot
- Claiming Founder AI consumes pipeline result (telemetry only today)

---

## API

```ts
await runIntelligencePipeline(
  { specialist: 'gym', userMessage: 'What should I train today?', intent: 'train_today' },
  { declaredProfile, domainEvidence, produceResponse, readOnly },
)
```
