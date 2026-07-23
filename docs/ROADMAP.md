# Product Roadmap (Vertical Slices)

This roadmap organises FounderOS by **product slices**, not feature laundry lists. Each slice should move toward the [Domain Framework](./DOMAIN_FRAMEWORK.md) completeness bar.

Maturity scale:

| Level | Meaning |
|-------|---------|
| **Prototype** | UI or logic exists; incomplete persistence, tests, or honesty |
| **Alpha** | Core loop works for one user; local or partial cloud; tests starting |
| **Beta** | Repository pattern, tests in `check`, explainable recommendations, staging-ready |
| **Production** | RLS-hardened cloud, operable docs, monitored, multi-engineer safe |

Root `ROADMAP.md` is historical; **this file is the engineering product roadmap.**

---

## Gym Product

| | |
|--|--|
| **Current maturity** | **Beta** (local-first primary; Supabase schema + repository + Active Workout v2; strong tests) |
| **Target maturity** | **Production** |
| **Remaining work** | Multi-device resume / ID mapping for legacy local ids; cloud as equal SOT; richer post-workout → next-session personalisation UI; staging SQL always applied; deepen evaluation scenarios |
| **Dependencies** | Kernel events, Memory Engine, evidence registry, auth/RLS, staging deploy |

**Slice intent:** Research-backed training specialist — profile → plan → approve → log → review → history → progression — without medical claims.

Docs: `gym-personalisation-v1.md`, `gym-evidence-intelligence-v1.md`, `active-workout-engine-v2.md`.

---

## Founder Product

| | |
|--|--|
| **Current maturity** | **Alpha / Beta** (deterministic specialist + Founder AI v2 + conversation + cognitive integration; classic projects on Supabase) |
| **Target maturity** | **Production** |
| **Remaining work** | Unify classic project persistence with specialist repository discipline where it still leaks into UI; harden `/api/command` and stub risks; expand evaluation coverage; clearer proposal-approval UX; reduce dual-model confusion in docs |
| **Dependencies** | Kernel, cognitive model, decision/outcome engines, project `lib/db`, OpenAI routes, evaluation harness |

**Slice intent:** “What matters now?” for builders — capture, prioritise, decide, execute, review — with LLMs proposing and engines deciding truth.

Docs: `founder-ai-v1.md`, `founder-ai-v2.md`, `conversational-founder-ai-v1.md`, `founderos-home-v1.md`, `founder-ai-evaluation-v1.md`.

---

## School Product

| | |
|--|--|
| **Current maturity** | **Prototype** (domain intelligence lens only; no specialist package) |
| **Target maturity** | **Alpha** then **Beta** |
| **Remaining work** | Full specialist under `lib/specialists/school/` per Domain Framework; courses/assignments data model; study recommendations; history of study sessions; repository + tests; route surface |
| **Dependencies** | Domain Framework, Kernel, Memory Engine, capture/signals; optional calendar adapter |

**Slice intent:** Learning plans, review loops, and exam/project study execution for students and founder-learners.

---

## Finance Product

| | |
|--|--|
| **Current maturity** | **Prototype** (domain lens only) |
| **Target maturity** | **Alpha** |
| **Remaining work** | Specialist scaffold; accounts/cashflow/runway types; explainable recommendations with hard non-advice disclaimers; import/capture path; repository; no fabricated balances |
| **Dependencies** | Domain Framework, Kernel, strong compliance/disclaimer review before beta |

**Slice intent:** Founder-relevant money awareness (runway, burn, simple planning) — not a bank or regulated advisor.

---

## Health Product

| | |
|--|--|
| **Current maturity** | **Prototype** (overlaps Gym; domain lens; recovery inputs exist as data, not a full Health specialist) |
| **Target maturity** | **Alpha** (non-Gym health: sleep, symptoms logging, energy) coordinated with Gym |
| **Remaining work** | Clarify Gym vs Health boundary; Health specialist types/repo; fatigue inputs consumed by recovery engine without medical diagnosis claims; shared metrics contracts |
| **Dependencies** | Gym Product, Memory Engine, Domain Framework |

**Slice intent:** Lifestyle health signals that inform planning — never diagnosis or treatment.

---

## Relationship Product

| | |
|--|--|
| **Current maturity** | **Prototype** (domain lens only) |
| **Target maturity** | **Alpha** |
| **Remaining work** | Specialist for relationship commitments/check-ins; privacy-first storage; gentle recommendations; no manipulative “social AI” framing |
| **Dependencies** | Domain Framework, Memory Engine, strong privacy review |

**Slice intent:** Help founders honour important personal commitments without becoming a social network.

---

## Travel Product

| | |
|--|--|
| **Current maturity** | **Prototype** / not started as specialist |
| **Target maturity** | **Alpha** |
| **Remaining work** | Trip objects, packing/execution checklists, calendar signal integration, specialist scaffold |
| **Dependencies** | Object Engine, Signal/Sync, calendar adapter, Domain Framework |

**Slice intent:** Trip planning and execution as first-class work, linked to calendar reality.

---

## Knowledge Product

| | |
|--|--|
| **Current maturity** | **Alpha** (Knowledge Engine + links/graph + file summaries + vector memory APIs; docs exist) |
| **Target maturity** | **Beta / Production** |
| **Remaining work** | Clear UX that distinguishes Knowledge Engine principles vs vector search vs Memory Engine history; indexing reliability; specialist-facing retrieval APIs; keep engines as SOT |
| **Dependencies** | Memory Engine, vector SQL, OpenAI embeddings, Object Engine |

**Slice intent:** Durable principles and retrievable knowledge that guide future action — not a second chat log.

Docs: `knowledge-engine.md`, `memory-engine.md`, `object-engine.md`, vector SQL under `supabase/`.

---

## Execution Product

| | |
|--|--|
| **Current maturity** | **Alpha / Beta** (morning/evening loops, decision/outcome engines, action engine, home “what matters now”, command bar) |
| **Target maturity** | **Production** |
| **Remaining work** | Tighten Home as daily OS; ensure morning→evening learning loop is reliable; mobile shell; command bar non-stub completeness; cross-specialist prioritisation via domain intelligence |
| **Dependencies** | Kernel, Decision/Outcome, Cognitive Model, Signal Engine, all specialists publishing honest events |

**Slice intent:** The daily operating rhythm — capture, prioritise, act, review — across domains.

Docs: `morning-execution-slice.md`, `evening-review-daily-learning-loop.md`, `decision-engine-v1.md`, `outcome-engine-v1.md`, `founderos-home-v1.md`, `universal-capture.md`.

---

## Platform / Engineering foundation (cross-cutting)

Not a user product, but required for every slice:

| Work | Status |
|------|--------|
| Engineering handbook (`docs/VISION`…`WORKFLOW`) | In progress / this docs set |
| Private staging deployment | Documented; apply per environment |
| `npm run check` quality gate | Active |
| Provider acyclic graph tests | Active |
| Dual persistence convergence (local engines ↔ Supabase) | Ongoing |

---

## Sequencing guidance

1. Finish **Gym → Production** as the template specialist.  
2. Harden **Founder + Execution** as the daily OS.  
3. Raise **Knowledge** clarity (three memory concepts documented and UX-separated).  
4. Add the next specialist (**School** recommended) strictly via Domain Framework.  
5. Only then expand Finance / Health / Relationships / Travel.

Product rule unchanged: do not add features that do not strengthen the core loop or a named vertical slice.

---

## Related reading

- [VISION.md](./VISION.md)
- [DOMAIN_FRAMEWORK.md](./DOMAIN_FRAMEWORK.md)
- [WORKFLOW.md](./WORKFLOW.md)
- [private-staging-deployment.md](./private-staging-deployment.md)
