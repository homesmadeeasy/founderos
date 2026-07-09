# Founder AI v1

## Why Founder AI exists

FounderOS had a **Founder domain** inside Domain Intelligence — a score, risks, and recommendations among six life areas. That was useful but generic.

**Founder AI** is a specialist layer that reads the same live state and produces **founder-specific strategic advice**: what to build, what to ignore, whether you're overengineering, and what sprint to run next.

It is not a new engine. It is a vertical composition layer — like Home, but focused entirely on building, validating, and shipping.

## Design philosophy

1. **Honest advisor** — If validation is weak, say so. If infrastructure is ahead of users, say so.
2. **No engine terminology** — Users see strategy, not kernel/decision/memory internals.
3. **Computed from live state** — No duplicate storage; reads objects, memories, signals, outcomes, domain intelligence, morning plan, etc.
4. **Deterministic v1** — Rule-based scoring and narrative; LLM can replace narrative generation later.
5. **Premium surface** — Glass cards, soft gradients, consistent with Home.

## Architecture

```
lib/specialists/founder/
  founderTypes.ts      — FounderSnapshot, risks, sprint, evidence
  founderSignals.ts    — Filter founder-relevant data
  founderEvidence.ts   — Build evidence list
  founderScoring.ts    — Product, validation, architecture, execution scores
  founderStrategy.ts   — Stage, bottleneck, recommendation, roadmap
  founderRisks.ts      — Risk detection
  founderSprint.ts     — Sprint generation
  founderNarrative.ts  — Chief-of-staff prose
  founderQuestions.ts  — Q&A from snapshot
  founderUtils.ts      — buildFounderSnapshot orchestrator
  founderAssistant.ts  — Bridge from AssistantContext
```

**Entry point:** `buildFounderSnapshot(FounderInput)` → `FounderSnapshot`

**UI:** `/founder` page + `useFounderSnapshot()` hook

## FounderSnapshot

| Field | Purpose |
|-------|---------|
| momentumScore | Overall founder momentum |
| productScore | User-facing surfaces shipped |
| validationScore | External user proof |
| architectureScore | Technical/infrastructure progress |
| executionScore | Tasks, outcomes, loops closed |
| riskScore | Elevated founder risk level |
| currentStage | idea → prototype → mvp → validation → growth |
| mainBottleneck | Validation, Overengineering, UX, etc. |
| topRecommendation | Single highest-leverage move |
| ignoreToday | What to defer |
| risks | Detected founder risks |
| suggestedSprint | Practical sprint with tasks + definition of done |
| evidence | Why Founder AI thinks this |
| narrative | Natural briefing |

## Scoring logic (v1)

- **Architecture** rises with technical memories, coding signals, systems knowledge
- **Validation** rises with user/feedback/interview memories; falls when architecture >> validation
- **Product** rises when user-facing features appear in memories (Home, capture, morning, etc.)
- **Overengineering risk** triggers when architecture > 65 and validation < 40

## Integrations

| Surface | Integration |
|---------|-------------|
| `/founder` | Full specialist page |
| Sidebar | Founder as primary nav item |
| Home | Founder domain card links to `/founder`; insight card when founder is top domain |
| Quick Actions | Founder dock button → `/founder` |
| Assistant | "Ask Founder", "Am I overengineering?", sprint/bottleneck/risk questions |
| Command palette | Navigate to Founder AI |

## Assistant phrases

- Ask Founder
- What should I build next?
- Am I overengineering?
- What is the founder bottleneck?
- How do I get users?
- What should I ignore?
- What is the next sprint?
- What is the biggest risk?

## Limitations (v1)

- Rule-based scoring only — no LLM narrative
- No persisted founder history or sprint tracking
- Tasks/projects from AppContext on page; assistant uses Command Center counts
- UX score is derived, not from real usability tests
- Weather/user adapters not connected — validation inferred from memories/signals text

## Future roadmap

- **Founder AI v2** — LLM-generated narrative and sprint tasks via Edge Function
- **Sprint tracking** — Mark sprint tasks complete, record outcomes
- **User validation adapter** — Real interview/feedback signals
- **PMF score** — Structured validation metrics
- **Specialist pattern** — Replicate for School AI, Health AI

## Acceptance

- `/founder` works with live snapshot
- Sidebar + Home + Assistant integrated
- Honest recommendations when validation is weak
- `npm run build` passes
- No new storage layer
