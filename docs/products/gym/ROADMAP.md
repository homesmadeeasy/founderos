# Gym Product — Roadmap

Vertical-slice roadmap for Gym only. Parent slices: [docs/ROADMAP.md](../../ROADMAP.md).

Maturity: **Beta** (now) → **Production** (target).

---

## Now (shipped baseline)

- Profile onboarding + first-session intent  
- Evidence-informed today’s workout + Why?  
- Approve / start / skip / reschedule  
- Active Workout Engine v2 (mobile logger, rest, review, sync badge)  
- History list + completed detail  
- Double progression + volume + recovery heuristic snapshot  
- Research library (seeded)  
- Deterministic conversation chips  
- Local SOT v3 + `GymRepository` + Supabase schema/RLS + pending queue  
- Kernel + Memory on finish  
- Automated gym test suites in `npm run check`

---

## Next (Production hardening)

| Milestone | Outcome |
|-----------|---------|
| **P0 Cloud identity & resume** | Legacy id map; hydrate active from cloud when local empty; conflict by `updatedAt`; no dual in-progress forks |
| **P0 Staging ops** | `gym.sql` applied on staging; RLS smoke; env documented |
| **P1 Sync UX** | Pending ops visibility beyond logger; retry control; home/history offline hint |
| **P1 Equal SOT** | Authenticated users treat cloud as durable backup with verified round-trip tests |
| **P1 Evaluation** | Gym scenarios in founder/gym eval harness (honesty + prescription) |
| **P2 Progression UX** | Stronger “Why this adjustment?” confidence; deload path if product wants it emitted |

---

## Later (feature slices inside Gym)

| Slice | Depends on | Notes |
|-------|------------|-------|
| **Templates UX** | Schema already | User-built reusable sessions |
| **Richer personalisation** | History density | Next-session plan reacts to logged RPE/RIR with bounded rules |
| **Knowledge graph writes** | Knowledge Engine | Persist training principles/links; not only evidence seed |
| **Research ingestion** | Ops + moderation | Scheduled source ingest; keep human/approval gate |
| **Video / technique analysis** | Privacy, offline-friendly design | Optional; never block logging; no medical claims |
| **Wearables** | Health product boundary | HRV/sleep import as *inputs* to recovery heuristic |
| **Coach mode** | Auth model change | Explicitly post-Production single-user |

---

## Explicit non-roadmap (reject unless vision changes)

- Clinical rehab protocols as medical advice  
- Social feed / leaderboards as core Gym  
- Autonomous LLM rewriting historical sets  
- Replacing `GymDataContext` with ad-hoc page state  

---

## Exit criteria: Beta → Production

- [ ] Multi-device resume verified on staging  
- [ ] UUID + legacy migration path documented and tested  
- [ ] No known honesty bugs in volume/PR/progression  
- [ ] Manual golden path + offline path signed off  
- [ ] `npm run check` green; gym SQL deployed  
- [ ] Product copy audited for medical claim language  
- [ ] Handbook + this folder kept current  

---

## Sequencing vs other products

Gym remains the **reference specialist**. Prefer finishing Gym Production before scaffolding School/Finance specialists ([DOMAIN_FRAMEWORK.md](../../DOMAIN_FRAMEWORK.md)). Health product owns non-Gym health signals; Gym continues to *consume* recovery-relevant inputs without absorbing clinical scope.
