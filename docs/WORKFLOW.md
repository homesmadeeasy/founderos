# Development Workflow

Official path from idea to release for FounderOS. Designed for multiple engineers sharing one repository.

---

## Pipeline

```
Idea
  → Specification
  → Architecture
  → Implementation
  → Tests
  → Codex / automated review
  → Manual testing
  → Merge
  → Release
```

### 1. Idea

Capture the problem and user outcome. Reject ideas that do not improve:

**Capture → Organise → Plan → Execute → Review → Improve**

or a named specialist vertical ([ROADMAP.md](./ROADMAP.md)).

### 2. Specification

Write a short spec (PR description or `docs/<feature>.md`):

- User problem
- In scope / out of scope
- Data that must persist
- Events to publish
- Explicit non-goals (no medical claims, no invented history, …)

### 3. Architecture

Align with [ARCHITECTURE.md](./ARCHITECTURE.md) and [DOMAIN_FRAMEWORK.md](./DOMAIN_FRAMEWORK.md).

Decide: domain types, repository needs, SQL/RLS, kernel events, provider placement, test plan.

Do **not** redesign unrelated systems in the same change.

### 4. Implementation

- Follow [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- Repository-first for specialist data
- Extend existing types; avoid parallel models
- Keep diffs focused

### 5. Tests

- Add/adjust `*Tests.ts` for domain rules
- Run targeted scripts + `npm run typecheck`
- Include suites in `npm run check` when the surface is user-facing

### 6. Codex / automated review

- Run `npm run check` (or the largest relevant subset) before review
- Use PR review / Bugbot / security review when requested
- Fix type errors and test failures introduced by the change

### 7. Manual testing

Use the feature doc checklist. For Gym-like flows, verify desktop and ~390px mobile, resume after refresh, and offline/online if sync is involved.

### 8. Merge

- PR into the agreed base branch (`main` unless otherwise specified)
- Clean history; no secrets
- Reviewer confirms standards + tests

### 9. Release

- Staging first ([private-staging-deployment.md](./private-staging-deployment.md))
- Apply SQL migrations when schema changed
- Smoke auth + critical specialist paths
- Only then production

---

## Branch naming

| Pattern | Use |
|---------|-----|
| `feat/<area>-<short-slug>` | New capability |
| `fix/<area>-<short-slug>` | Bug fix |
| `chore/<short-slug>` | Tooling, docs-only, deps |
| `refactor/<area>-<short-slug>` | Internal structure (no behaviour change preferred) |

Examples: `feat/gym-active-workout-v2`, `docs/engineering-handbook`, `fix/gym-resume-duplicate-session`.

Prefer small vertical slices over long-lived branches.

---

## Commit message conventions

Follow the existing style: **imperative summary**, focus on **why**.

```
Add Active Workout Engine v2 for usable live Gym logging.

Ship a mobile-first logger with idempotent persistence and offline sync.
```

Rules:

- Subject ≤ ~72 chars, no trailing period required
- Use `Add` / `Fix` / `Update` / `Harden` / `Document` accurately
- Body optional; use for context and risk notes
- Never commit secrets (`.env`, keys)
- Do not use `--no-verify` unless explicitly required and called out

---

## Code review expectations

Reviewers check:

- [ ] Matches vision / does not invent user data
- [ ] Domain framework respected (types, repository, tests)
- [ ] No direct Supabase from specialist components
- [ ] Kernel events appropriate; no new engine coupling spaghetti
- [ ] Accessibility and mobile for interactive flows
- [ ] Docs updated when architecture or user-facing behaviour changes
- [ ] Tests cover honesty/idempotency for critical paths

Authors should self-review the diff and paste a short test plan in the PR.

---

## Testing checklist (before merge)

- [ ] `npm run typecheck`
- [ ] Relevant `npm run test:*` suites
- [ ] `npm run test:providers` if providers changed
- [ ] `npm run build` for release-facing or risky changes
- [ ] Manual path from the feature doc
- [ ] RLS/SQL reviewed if schema changed
- [ ] No leftover debug UI or hardcoded user ids

Full gate: `npm run check`.

---

## Release checklist

- [ ] Spec + architecture doc merged or linked
- [ ] Migrations applied on staging (`supabase/*.sql` order)
- [ ] Env vars validated (`lib/env`)
- [ ] Auth login + protected routes smoke test
- [ ] Specialist critical path smoke test (e.g. Gym approve → log → finish)
- [ ] Error monitoring / logs glanced (when available)
- [ ] Rollback plan noted (revert commit / feature flag if any)
- [ ] Handbook or feature docs not left stale

---

## PR template (suggested)

```markdown
## Summary
- …

## Spec / docs
- Link to docs/…

## Test plan
- [ ] …
- [ ] npm run …

## Risk / non-goals
- …
```

---

## Related reading

- [VISION.md](./VISION.md)
- [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- [ROADMAP.md](./ROADMAP.md)
