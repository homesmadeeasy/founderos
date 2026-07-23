# FounderOS Engineering Handbook

**Single source of truth** for how we build FounderOS as a production-grade product.

If code and docs disagree, fix one of them in the same change. Feature milestone docs remain valid for deep dives; the handbook docs below define **team contracts**.

---

## Start here

| Document | Purpose |
|----------|---------|
| [VISION.md](./VISION.md) | Mission, philosophy, what we are / are not, success principles |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System layers, kernel, memory, repositories, AI, Supabase, events |
| [DOMAIN_FRAMEWORK.md](./DOMAIN_FRAMEWORK.md) | Blueprint every specialist AI must follow (Gym = reference) |
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) | TypeScript, folders, hooks, repos, tests, a11y, no UI→DB |
| [WORKFLOW.md](./WORKFLOW.md) | Idea → release pipeline, branches, commits, review, checklists |
| [ROADMAP.md](./ROADMAP.md) | Vertical product slices and maturity targets |

---

## How to use this handbook

**New engineer**

1. Read Vision → Architecture → Domain Framework.  
2. Skim Coding Standards + Workflow.  
3. Run the app (`DEVELOPMENT.md` / root `README.md`) and walk Gym as the reference specialist.  
4. Pick a vertical slice from the Roadmap.

**New specialist feature**

1. Spec against Domain Framework checklist.  
2. Architecture note in `docs/<feature>.md`.  
3. Implement repository-first.  
4. Tests + manual checklist + PR per Workflow.

**Changing shared systems** (kernel, providers, env, RLS)

1. Update Architecture (and affected feature docs).  
2. Run `npm run test:providers` and `npm run check` as applicable.  
3. Call out migration/ops steps for staging.

---

## Quality gate

```bash
npm run check
```

Includes typecheck, provider tests, founder-intelligence, gym suites, env tests, and production build. See `package.json` for granular `test:*` scripts.

---

## Feature & milestone docs

These are historical and deep-dive design records. Prefer them for implementation detail; prefer the handbook for team rules.

### Core engines & OS

| Doc |
|-----|
| [object-engine.md](./object-engine.md) |
| [memory-engine.md](./memory-engine.md) |
| [knowledge-engine.md](./knowledge-engine.md) |
| [executive-engine.md](./executive-engine.md) |
| [founder-kernel-v1.md](./founder-kernel-v1.md) |
| [cognitive-model-v1.md](./cognitive-model-v1.md) |
| [decision-engine-v1.md](./decision-engine-v1.md) |
| [outcome-engine-v1.md](./outcome-engine-v1.md) |
| [domain-intelligence-layer-v1.md](./domain-intelligence-layer-v1.md) |
| [connected-reality-signal-engine.md](./connected-reality-signal-engine.md) |
| [source-adapters-sync-engine.md](./source-adapters-sync-engine.md) |
| [universal-capture.md](./universal-capture.md) |

### Daily loops & home

| Doc |
|-----|
| [morning-execution-slice.md](./morning-execution-slice.md) |
| [evening-review-daily-learning-loop.md](./evening-review-daily-learning-loop.md) |
| [founderos-home-v1.md](./founderos-home-v1.md) |

### Founder AI

| Doc |
|-----|
| [founder-ai-v1.md](./founder-ai-v1.md) |
| [founder-ai-v2.md](./founder-ai-v2.md) |
| [conversational-founder-ai-v1.md](./conversational-founder-ai-v1.md) |
| [founder-ai-evaluation-v1.md](./founder-ai-evaluation-v1.md) |

### Gym AI (reference specialist)

| Doc |
|-----|
| [gym-personalisation-v1.md](./gym-personalisation-v1.md) |
| [gym-evidence-intelligence-v1.md](./gym-evidence-intelligence-v1.md) |
| [active-workout-engine-v2.md](./active-workout-engine-v2.md) |

### Integrations & ops

| Doc |
|-----|
| [google-calendar-adapter.md](./google-calendar-adapter.md) |
| [private-staging-deployment.md](./private-staging-deployment.md) |

---

## Related repo roots

| Path | Notes |
|------|--------|
| `../README.md` | Product overview + local setup |
| `../DEVELOPMENT.md` | Developer guide (partially overlaps; handbook wins on architecture contracts) |
| `../ROADMAP.md` | Legacy feature list — use [docs/ROADMAP.md](./ROADMAP.md) for slices |
| `../supabase/README.md` | SQL migration order |
| `../TEST_PROMPTS.md` | Manual prompt ideas |

---

## Ownership

- Handbook updates ship with the architectural change that requires them.
- Specialist owners keep Domain Framework checklists honest in PRs.
- Do not fork a second “team wiki” outside `/docs` without linking it from this README.
