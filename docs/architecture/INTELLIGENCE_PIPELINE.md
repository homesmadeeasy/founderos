# FounderOS Intelligence Pipeline

**Canonical reasoning lifecycle** for every specialist AI (Gym, Founder, School, Finance, …).

This document is the official contract. Specialists must not invent parallel context-assembly flows.

**Orchestration only** — this layer does **not** replace Identity, Reality, Memory, Cognitive Model, Reasoning, Decision, Executive, Domain Intelligence, or Action Engine. It calls them in a fixed order and returns one structured result.

Code: `lib/intelligence-pipeline/` · Context: `contexts/IntelligencePipelineContext.tsx` · Inspector: `/intelligence-inspector`

---

## Lifecycle

```
User Question
    ↓
Conversation Context
    ↓
Identity
    ↓
Reality Snapshot
    ↓
Memory Retrieval
    ↓
Relevant Knowledge
    ↓
Beliefs (World Model)
    ↓
Goals
    ↓
Evidence
    ↓
Reasoning
    ↓
Decision
    ↓
Recommendation
    ↓
Response
    ↓
Memory Update (hook)
    ↓
Reality Update (hook)
    ↓
Identity Observation (hook)
```

API:

```ts
const result = await runIntelligencePipeline(
  { specialistId: 'gym', question },
  sources, // optional bag + produceResponse + post-hooks
)
// result: IntelligenceResult (standard output + trace)
```

React specialists:

```ts
const { run } = useIntelligencePipeline()
await run({ specialistId: 'founder', question })
```

---

## Standard output (`IntelligenceResult`)

| Field | Purpose |
|-------|---------|
| `identitySummary` | Who |
| `realitySummary` | What is happening now |
| `relevantMemories` | Structured memory hits |
| `relevantBeliefs` | World-model beliefs |
| `supportingEvidence` | Why we believe this |
| `reasoning` | Explanation chain |
| `confidence` | Propagated 0–1 |
| `recommendedActions` | Bounded next steps |
| `explanation` | Human-readable grounding |
| `missingInformation` | Honest gaps |
| `response` | Specialist answer text |
| `trace` | Stage observability |

No specialist may invent a private parallel result shape for pipeline-backed answers.

---

## Observability

Every run produces `IntelligenceTrace` with per-stage status:

`ok` · `skipped` · `degraded` · `failed`

Duplicate stage attempts in one run are blocked.

Developer UI: **`/intelligence-inspector`** (not for end users).

---

## Engine audit

| Engine | Purpose | Inputs | Outputs | Dependencies | Consumers | Duplicates / gaps | Confidence | Status |
|--------|---------|--------|---------|--------------|-----------|-------------------|------------|--------|
| **Identity** | Who the user is (declared/observed) | Declare / signals / review | Facts, views, prompt blocks | Repo, kernel | Identity UI, Pipeline, Gym via pipeline | Overlaps cognitive “user claims” | High | Implemented and used |
| **Reality (`lib/reality`)** | Live events / snapshot | recordEvent / kernel ingest | Timeline, snapshot | Repo, kernel | Reality UI, Pipeline, Gym actions | Distinct from cognitive belief Reality — naming overlap | High | Implemented and used |
| **Memory Engine** | Structured life history | CRUD / search | Memory records | Local-first | Most providers, Pipeline | Dual with vector memory | High | Implemented and used |
| **Vector memory** | Semantic retrieval | Embeddings / ask API | Citations | Supabase, OpenAI | Memory Search UI | Not in pipeline v1 (gap) | Med | Implemented but disconnected from specialist pipeline |
| **Cognitive / World Model** | Beliefs, contradictions, unknowns | Founder evidence, conversation claims | WorldModel, cognitive Reality snapshot | Kernel, founder base | Founder/Gym inputs, Pipeline beliefs | “Reality” name clash with `lib/reality` | High | Implemented and used |
| **Reasoning Engine** | Daily focus / plan / risks | DailyContext | DailyReasoningOutput | Morning, executive | Morning, Decision, Pipeline | Overlaps Executive recommendations | High | Implemented and used |
| **Executive Engine** | Attention / briefings / Q&A | Objects, memory, knowledge | Recommendations, scores | Providers | Morning, Command Center, Pipeline | Overlaps Reasoning/Decision | High | Implemented and used |
| **Decision Engine** | Ranked daily decisions | Engines + reasoning + domains | DecisionOutput | Morning pipeline | Morning, Founder/Gym inputs, Pipeline | Overlaps Executive/Reasoning | High | Implemented and used |
| **Domain Intelligence** | Cross-domain priority | Objects, memory, signals, plans | DomainIntelligenceOutput | Morning | Domains UI, Decision, snapshots | Overlaps Executive conflicts | High | Implemented and used (Morning-gated) |
| **Action Engine** | Propose / approve / execute | ActionType + payload | History, kernel events | Handlers | Gym, Founder proposals | Founder has separate proposal store | High | Implemented and used |
| **Conversation** | Founder dialogue loop | FounderInput, world model | Sessions, turns | Cognitive, Founder AI | Founder/Home | Multiple reasoners inside | High | Implemented and used |
| **Founder AI** | LLM + deterministic founder answers | Compact context | Responses, proposals | Conversation | Conversation | Parallel to rule reasoner | High | Implemented and used |
| **Gym AI** | Deterministic gym Q&A | GymSnapshot + pipeline | Answer string | Gym data, Pipeline | Gym UI | Not on ConversationProvider | High | Implemented and used |
| **Object / Knowledge / Signal** | Entities, principles, signals | CRUD / ingest | Records | Repos | Snapshots, Decision, Pipeline knowledge | Bridges duplicate event forms | High | Implemented and used |
| **Intelligence Pipeline** | Canonical orchestration | Request + source bag | IntelligenceResult + trace | All of the above (read) | Gym, Founder conversation, Inspector | — | High | Implemented and used |

### Deprecated / avoid

| Flow | Status | Guidance |
|------|--------|----------|
| Specialist manually calling Identity + Reality + Memory ad hoc | **Deprecated** | Use `useIntelligencePipeline().run()` |
| Treating cognitive `realitySnapshot` as the live operating state | **Deprecated naming** | Use `lib/reality` for “what happened”; cognitive Reality for belief reconciliation |
| Parallel answer formats per specialist | **Deprecated** | Use `IntelligenceResult` |
| Morning `runPipeline` for chat Q&A | **Not a substitute** | Morning pipeline remains for daily plan; chat uses Intelligence Pipeline |

---

## Post-response hooks

| Hook | When |
|------|------|
| `onMemoryUpdate` | After response (optional specialist) |
| `onRealityUpdate` | After **actions** (e.g. approved workout) |
| `onIdentityObservation` | After **conversation** turns |

Mutations still go through existing engines — hooks only invoke them.

---

## Related docs

- [ARCHITECTURE.md](../ARCHITECTURE.md) — system map (updated to point here)
- [identity/OVERVIEW.md](../identity/OVERVIEW.md)
- [reality/OVERVIEW.md](../reality/OVERVIEW.md)
- [DOMAIN_FRAMEWORK.md](../DOMAIN_FRAMEWORK.md)
