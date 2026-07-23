# Gym Product — Overview

**Status:** Engineering specification (vertical slice)  
**Maturity:** Beta → Production target ([docs/ROADMAP.md](../../ROADMAP.md))  
**Reference specialist:** Gym is the Domain Framework template ([DOMAIN_FRAMEWORK.md](../../DOMAIN_FRAMEWORK.md))

This folder is the **complete product specification** for Gym. Implementation must follow these docs. Feature milestone notes (`gym-personalisation-v1.md`, `active-workout-engine-v2.md`, …) remain deep dives; **this product pack is the contract.**

---

## Purpose

Gym AI helps founders and builders train with structure: plan today’s session, log real sets under gym conditions, review honestly, and progress with explainable, evidence-bounded recommendations — without inventing history or making medical claims.

Gym closes the FounderOS loop for physical training:

**Capture (log) → Organise (history/volume) → Plan (today’s workout) → Execute (active logger) → Review (session summary) → Improve (progression / next session)**

---

## Users

| Persona | Needs |
|---------|--------|
| **Builder / founder** | Efficient sessions, clear “what today?”, resume after interruptions |
| **Intermediate lifter** | Double progression, RPE/RIR tracking, volume awareness |
| **Beginner** | Sensible defaults, no invented loads, guided onboarding |
| **Engineer extending Gym** | One domain model, repository-first, tests, kernel events |

Not primary users (yet): coaches managing multiple athletes, clinical populations, regulated rehab.

---

## Goals

1. One durable gym identity (profile + equipment + tracking mode).
2. One honest session lifecycle (planned → in progress → completed / skipped / cancelled).
3. Set-level logging fast enough for the gym floor (mobile-first).
4. Recommendations that are **bounded, evidence-backed, and explainable**.
5. Statistics that never treat planned/skipped/incomplete as completed training.
6. Local-first reliability with optional cloud sync (production: equal multi-device SOT).
7. Kernel + Memory integration so FounderOS cognition can see training reality.

---

## Scope (in product / implemented or schema-ready)

| Area | In scope |
|------|----------|
| Profile & onboarding | Goal, experience, days, duration, equipment, tracking mode, first-session choice |
| Today’s workout | Generate, approve, start, skip, reschedule offer |
| Active logging | Sets, rest timer, pause/resume, substitute/reorder/add, review, finish/discard |
| History | List + completed session detail |
| Progression | Double progression records from completed working sets |
| Volume & recovery heuristics | Weekly muscle volume; recovery *assessment* from inputs (not diagnosis) |
| Evidence / research library | Seeded claims, prescription rationale, research UI |
| Conversation | Deterministic chip Q&A over gym snapshot |
| Persistence | Versioned local datastore + `GymRepository` + Supabase SQL/RLS + pending queue |
| Kernel events | Workout/set/PR/recovery-input/profile/routine events |
| Tests | Domain, schema shape, active workout, personalisation suites |

---

## Future scope (specified here, not fully built)

| Area | Spec posture |
|------|----------------|
| **Video / technique analysis** | Types exist as `placeholder`; product intent documented — no live vision pipeline |
| **Gym knowledge graph SOT** | Evidence claim refs exist; full Knowledge Engine / links graph write path is future |
| **Recovery lifecycle (full)** | Exertion inputs + heuristic assessment today; durable recovery state machine + Health boundary is future |
| **Cloud as equal SOT** | Schema + sync exist; multi-device hydrate / conflict resolve is Production milestone |
| **Templates UX** | Types + SQL reserved; not core user flow yet |
| **External research ingestion jobs** | Adapter stubs only |
| **Coach / multi-athlete** | Out of scope for current product |
| **Wearables / HRV integrations** | Future integrations section |

Anything marked **Future** must not be claimed as shipped in UI copy or release notes.

---

## Non-goals

- Medical diagnosis, treatment, or injury rehabilitation advice.
- Inventing completed sets, PRs, or prior loads.
- Claiming recovery “changed” solely because a workout finished (record inputs; let recovery logic interpret).
- Unbounded LLM mutation of gym tables.
- Redesigning FounderOS shell or bypassing `GymDataContext` / repositories.

---

## Success metrics

| Metric | Intent |
|--------|--------|
| **Session completion rate** | Approve → finish with ≥1 valid working set |
| **Resume success** | Refresh / route change restores same active session without duplicates |
| **Logging latency** | Set complete feels instant (local write); sync never blocks logging |
| **Honesty** | Zero planned/skipped contribution to volume/progression in audits |
| **Explainability** | User can open “Why?” for prescriptions and live adjustments |
| **Mobile usability** | Primary logger usable at ~390px, no horizontal overflow, ≥44px targets |
| **Sync integrity** | Offline queue flushes once; no duplicate sets/sessions on retry |
| **Test gate** | `npm run check` includes gym suites green before Gym PRs merge |

---

## Document map

| Spec | Contents |
|------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layers, repos, kernel, AI pipeline, sync |
| [USER_FLOWS.md](./USER_FLOWS.md) | End-to-end flows + edge/failure states |
| [DATA_MODEL.md](./DATA_MODEL.md) | Types, lifecycles, Supabase schema |
| [CALCULATIONS.md](./CALCULATIONS.md) | Volume, e1RM, progression, recovery maths |
| [ROADMAP.md](./ROADMAP.md) | Gym slice milestones |
| [TEST_PLAN.md](./TEST_PLAN.md) | Manual + automated + a11y |
| [API.md](./API.md) | Context, repository, events, sync API |
| [COMPONENT_TREE.md](./COMPONENT_TREE.md) | Routes and UI tree |

---

## Related handbook

- [docs/VISION.md](../../VISION.md)
- [docs/ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/DOMAIN_FRAMEWORK.md](../../DOMAIN_FRAMEWORK.md)
- [docs/CODING_STANDARDS.md](../../CODING_STANDARDS.md)
- [docs/WORKFLOW.md](../../WORKFLOW.md)
