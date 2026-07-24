# FounderOS Intelligence System Audit

**Date:** 2026-07-23  
**Method:** Import tracing, provider mount inspection (`app/(app)/layout.tsx`, `app/(app)/gym/layout.tsx`), and runtime call-site review. File existence alone was not treated as “working.”

This audit feeds [INTELLIGENCE_PIPELINE.md](./INTELLIGENCE_PIPELINE.md). Goal: reduce fragmentation without deleting overlapping systems in this phase.

---

## Runtime provider graph (authenticated)

`AppProvider` → Memory → Identity → Object → Knowledge → Executive → Signal → Sync → UniversalCapture → **FounderKernel** → Reality → Morning → Evening → Cognitive → **IntelligencePipeline** → Action → Conversation → CommandBar → KernelSubscriberBootstrap

Gym additionally mounts `GymDataProvider` in `app/(app)/gym/layout.tsx`.

---

## System inventory

### Identity Engine — **preserve + adapt**

| | |
|--|--|
| **Paths** | `lib/identity/*`, `contexts/IdentityContext.tsx`, `supabase/identity.sql` |
| **Responsibility** | Declared vs observed user facts, confidence, evidence, history |
| **Inputs** | `declareFact`, `ingestSignals`, `reviewFact` |
| **Outputs** | `IdentityDatastore`, `IdentitySpecialistView`, prompt blocks |
| **Persistence** | localStorage `founderos-identity-v1`; Supabase repo exists; **cloud flush not wired in context** |
| **Consumers** | Identity UI; IntelligencePipelineProvider; GymConversationCard (observation); ConversationContext (observation) |
| **Status** | **Actively used** |
| **Overlap** | GymProfile stores parallel training facts; Cognitive beliefs also store user claims |
| **Gap (closed 2026-07-23)** | Gym onboarding mirrors high-value fields into Identity via `declareFact` (`gymIdentityBootstrap`); GymProfile remains planner SOT |

### Reality Engine (`lib/reality`) — **preserve + adapt**

| | |
|--|--|
| **Paths** | `lib/reality/*`, `contexts/RealityContext.tsx`, `supabase/reality.sql` |
| **Responsibility** | Live life events, timeline, operating snapshot |
| **Inputs** | `recordEvent`, kernel `ingestKernelEvent` |
| **Outputs** | Snapshot, timeline, specialist views |
| **Persistence** | local-first; cloud schema ready |
| **Consumers** | Reality dashboard; Pipeline; Gym action approval records events |
| **Status** | **Actively used** |
| **Overlap** | Cognitive-model “Reality” = belief reconciliation (different) |
| **Action** | Keep both; clarify naming in docs (done in pipeline contract) |

### Memory Engine — **preserve**

| | |
|--|--|
| **Paths** | `lib/memory-engine/*`, `contexts/MemoryEngineContext.tsx` |
| **Responsibility** | Structured historical records + keyword search |
| **Persistence** | localStorage |
| **Consumers** | Most engines; Pipeline keyword search |
| **Status** | **Actively used** |

### Vector memory — **investigate / adapt later**

| | |
|--|--|
| **Paths** | `lib/memory/*`, `app/api/memory/*`, `supabase/vector_memory.sql` |
| **Responsibility** | Semantic embeddings retrieval |
| **Consumers** | Memory search UI, project chat — **not** Intelligence Pipeline / Gym AI |
| **Status** | **Disconnected from canonical pipeline** |

### Cognitive Model / World Model / Beliefs — **preserve + adapt**

| | |
|--|--|
| **Paths** | `lib/cognitive-model/*`, `contexts/CognitiveModelContext.tsx` |
| **Responsibility** | Belief reconciliation from conversation + founder evidence |
| **Consumers** | `useFounderInput`, `useGymInput`, Conversation, Pipeline (belief list) |
| **Status** | **Actively used** |
| **Overlap** | Naming clash with `lib/reality`; partial Identity overlap |

### Reasoning Engine — **preserve**

| | |
|--|--|
| **Paths** | `lib/reasoning-engine/*` via MorningExecutionContext |
| **Responsibility** | Daily focus / plan / risks |
| **Status** | **Actively used** (morning). Pipeline copies summary string only — not request-scoped re-run |

### Decision Engine — **preserve**

| | |
|--|--|
| **Paths** | `lib/decision-engine/*` via Morning |
| **Status** | **Actively used** (morning). Pipeline receives flattened title/reason |

### Executive Engine — **preserve**

| | |
|--|--|
| **Paths** | `lib/executive-engine/*`, `contexts/ExecutiveEngineContext.tsx` |
| **Status** | **Actively used**. Pipeline receives recommendation titles |

### Domain Intelligence — **preserve + adapt**

| | |
|--|--|
| **Paths** | `lib/domain-intelligence/*` via Morning |
| **Status** | **Actively used** in snapshots/UI; **not directly** in Pipeline source bag |

### Action Engine — **preserve**

| | |
|--|--|
| **Paths** | `lib/action-engine/*`, `contexts/ActionEngineContext.tsx` |
| **Consumers** | Gym quick-log proposal; Founder proposal approvals |
| **Status** | **Actively used** |

### Founder AI — **adapt**

| | |
|--|--|
| **Paths** | `lib/ai/founder/*`, ConversationContext, `/api/ai/founder` |
| **Status** | **Actively used** |
| **Gap** | Runs Pipeline with empty `produceResponse`, then ignores result for answer — pipeline is telemetry only |

### Gym AI — **adapt (reference integration)**

| | |
|--|--|
| **Paths** | `lib/specialists/gym/*`, `components/gym/*`, `contexts/GymDataContext.tsx` |
| **Answer path** | `GymConversationCard.ask` → Pipeline → `answerGymQuestion` |
| **Pre-fix gap** | Pipeline only prefixed Identity/Reality **hints**; prescription still came solely from `GymSnapshot` without structured pipeline context in the answer contract |
| **Onboarding** | `GymOnboarding` → `GymProfile` only; no Identity declare |
| **Status** | **Actively used**; personalization split across GymProfile vs Identity |

### Intelligence Pipeline — **adapt (not a new engine)**

| | |
|--|--|
| **Paths** | `lib/intelligence-pipeline/*`, `contexts/IntelligencePipelineContext.tsx` |
| **Responsibility** | Thin orchestration + trace + standard result |
| **Persistence** | None (last result in module memory) |
| **Status** | **Actively used but thin** — must collect Gym domain evidence and drive Gym answer contract |

### Conversation / Kernel / Repositories

| System | Status | Note |
|--------|--------|------|
| Conversation | Used | Founder path; Pipeline not consumed for answer |
| Kernel | Used | Event bus; Reality/Cognitive/Gym subscribers |
| Local repos | Used | Identity, Reality, Memory, Gym primary |
| Supabase specialist repos | Partial | Gym sync exists; Identity/Reality cloud flush unwired |

---

## Fragmentation summary

1. **Two Gym profiles:** `GymProfile` (authoritative for planner) vs Identity training facts (mostly empty).
2. **Two “Reality” concepts:** event Reality vs belief Reality.
3. **Two memories:** structured vs vector (vector off pipeline).
4. **Three prioritizers:** Reasoning / Executive / Decision (morning-owned; OK if scoped).
5. **Pipeline not driving Gym prescription narrative** until this integration phase.

## Disposition

| System | Disposition |
|--------|-------------|
| Identity, Reality, Memory Engine, Cognitive, Reasoning, Decision, Executive, Action, Domain Intel, Gym planner/snapshot | **Preserve** |
| Intelligence Pipeline | **Adapt** — thicker Gym adapter, richer contracts, no new engines |
| Vector memory | **Investigate** for Phase 2 retrieval stage |
| GymProfile vs Identity | **Adapt** — mirror declared Gym bootstrap into Identity; GymProfile remains planner SOT |
| Cognitive “Reality” naming | **Investigate** rename in Phase 2 |

## Pre-existing limitations (not introduced by this task)

- Identity/Reality authenticated cloud flush unwired
- Vector memory disconnected from specialists
- Founder AI does not consume pipeline result for LLM context
