# FounderOS Vision

This document is the product north star for engineering. When a feature request conflicts with this vision, the vision wins until product explicitly revises it.

---

## Mission

FounderOS helps ambitious people turn messy reality — ideas, chats, notes, files, training, decisions, and daily work — into structured progress they can trust.

We build an **AI operating system for founders and builders**, not another chat window or generic productivity app.

---

## Product philosophy

1. **Reality first.** The product should reflect the user’s actual life and work, not invent a cleaner fiction.
2. **Engines over prompts.** Durable logic lives in typed engines, repositories, and domain rules. LLMs propose and narrate; they do not become the source of truth.
3. **Explainable intelligence.** Recommendations must be bounded, evidence-backed, and inspectable. Prefer “why this?” over magic.
4. **Capture → Improve loop.** Every product surface should strengthen:

   **Capture → Organise → Plan → Execute → Review → Improve**

5. **Specialists, not one omniscient agent.** Domain AIs (Founder, Gym, future School/Finance/…) own deep expertise. A kernel and shared cognition coordinate them.
6. **Local honesty, cloud durability.** Prefer correct local behaviour under poor connectivity; sync to Supabase without inventing duplicate domain models.
7. **Ship vertical slices.** Prefer a complete specialist path (data → advice → history → tests) over many half-wired screens.

---

## Long-term vision

FounderOS becomes the personal operating layer where:

- Life and work signals are captured once and reused everywhere.
- Domain specialists give actionable advice within clear guardrails.
- A cognitive / executive layer answers “what matters now?”
- Morning and evening loops close the day: plan → act → learn → improve tomorrow.
- Memory compounds — historical events, decisions, and principles — without drowning the user in chat logs.
- Multiple engineers can extend new specialists using one domain framework without rewriting the core.

Staging and private deployments come before broad production. Production readiness means: auth-hardened, RLS-safe, typed, tested, documented, and operable by a team.

---

## What FounderOS is

- An **AI OS** for founders, builders, coders, and ambitious students.
- A **multi-engine system**: objects, memory, knowledge, signals, decisions, outcomes, kernel orchestration, cognitive model, domain specialists.
- A **Next.js + Supabase** product with React contexts for lifecycle and repositories for persistence.
- A place where **projects, ideas, workouts, reviews, and capture** share one account and one event bus.
- A product that can run **deterministic intelligence** when LLMs are unavailable or inappropriate.

---

## What FounderOS is NOT

- Not a blank ChatGPT wrapper.
- Not a generic to-do list or Notion clone.
- Not a medical, legal, or financial advice service. Domain AIs must not make regulated claims.
- Not a multiplayer collaboration suite (yet). Single-user correctness comes first.
- Not a place for unbounded autonomous agents rewriting user data without approval.
- Not a dumping ground for unrelated features that do not improve the core loop.
- Not “AI everywhere” for its own sake — intelligence must be useful, bounded, and testable.

---

## Success principles

| Principle | Meaning for engineers |
|-----------|------------------------|
| **Trust** | Never invent completed work, PRs, recovery status, or history. Prefer insufficient data over fabrication. |
| **Separation** | UI ≠ domain logic ≠ persistence ≠ LLM I/O. |
| **Repository-first** | Components and pages do not call Supabase directly for specialist data. |
| **Kernel for coupling** | Engines react via events; they do not tightly call each other for everything. |
| **One model per domain** | Extend domain types; do not create parallel shadow models. |
| **Tests as product** | Specialist behaviour that users rely on needs automated coverage. |
| **Docs as contract** | Feature docs and this handbook stay accurate; stale docs are bugs. |
| **Accessibility & mobile** | Real use includes phones (~390px) and keyboard/screen-reader users. |
| **Staging before scale** | Private staging, RLS, env validation, and `npm run check` before claiming production. |

---

## Related reading

- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the system is built
- [DOMAIN_FRAMEWORK.md](./DOMAIN_FRAMEWORK.md) — how every specialist AI is structured
- [ROADMAP.md](./ROADMAP.md) — vertical product slices
- [README.md](./README.md) — engineering handbook index
