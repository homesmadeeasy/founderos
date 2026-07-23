# Coding Standards

Standards for FounderOS TypeScript / Next.js work. Prefer consistency with existing specialist and engine code over personal style.

---

## TypeScript conventions

- Strict typing at domain boundaries; validate/sanitize untrusted JSON (API bodies, localStorage, LLM output).
- Prefer `interface` for object shapes shared across modules; use unions for status enums.
- Avoid `any`. Use `unknown` + narrowing at edges.
- Prefer named exports for domain functions; default export is fine for React page/components that already use it.
- Path alias: `@/` for app imports.
- Server AI routes: `runtime = 'nodejs'` when using Node APIs; never expose secrets to the client.
- Env access: use `lib/env` helpers; public env must be statically readable for Next inlining (`NEXT_PUBLIC_*`).

---

## Naming

| Kind | Convention | Examples |
|------|------------|----------|
| React components | PascalCase | `ActiveWorkoutLogger`, `TodaysWorkoutCard` |
| Hooks | `use` + PascalCase | `useGymData`, `useFounderSnapshot` |
| Context providers | `*Provider` | `GymDataProvider` |
| Domain functions | verb + noun | `buildGymSnapshot`, `completeWorkout` |
| Kernel events | PascalCase verb | `WorkoutLogged`, `MemoryCreated` |
| localStorage keys | `founderos-<domain>-vN` | `founderos-gym-data-v1` |
| SQL tables | snake_case, domain prefix | `gym_workout_sessions` |
| Test files | colocated `*Tests.ts` | `gymActiveWorkoutV2Tests.ts` |
| Docs | kebab or clear milestone names | `active-workout-engine-v2.md` |

---

## Folder structure

```
app/(app)/          # authenticated routes
app/api/            # server routes
components/<area>/  # UI by feature/specialist
contexts/           # React providers
lib/
  specialists/<name>/
  *-engine/
  db/               # classic Supabase helpers
  ai/
  founder-kernel/
  supabase/         # clients, middleware helpers
supabase/           # SQL migrations
docs/               # engineering + feature docs
```

Do not invent new top-level trees without updating [ARCHITECTURE.md](./ARCHITECTURE.md) and this file.

---

## Hooks

- Hooks compose contexts and pure builders; keep them free of Supabase clients for specialist data.
- Pattern: `useXBaseInput` (no cognitive) → `useXInput` (base + cognitive) → `useXSnapshot`.
- Do not put heavy business rules in hooks — call domain modules.

---

## Contexts

- Own React state, hydration, and orchestration.
- Call repositories / storage APIs; publish kernel events.
- Keep provider dependency graphs **acyclic** (see `lib/contexts/providerTests.ts`).
- Mount specialist providers in route layouts when scope is limited (Gym).

---

## Repositories

- **Repository-first** for specialist durable state.
- Interface in domain storage module; local required; Supabase when schema exists.
- Idempotent writes (stable IDs); offline queue with stable op keys.
- Components **never** import `createClient` for specialist CRUD.

Classic product code may still use `lib/db/*` via `AppContext`; new specialist domains must not copy that shortcut.

---

## Testing expectations

- Prefer `npx tsx` domain test scripts unless the repo adopts a runner later.
- User-critical specialist behaviour belongs in `npm run check` (or a documented subset).
- Cover honesty: no invented completions, status filters, PR rules, resume/idempotency.
- SQL shape tests for RLS/tables when adding `supabase/*.sql`.
- Provider tests when adding contexts to the global tree.
- Do not claim “done” without running the relevant suites + `npm run typecheck` (and `build` for release-facing work).

---

## Documentation expectations

- Non-trivial slices get a `docs/<feature>.md` (problem, architecture, limitations, manual test steps).
- Update [DOMAIN_FRAMEWORK.md](./DOMAIN_FRAMEWORK.md) checklist mentally in the PR; update handbook docs when architecture rules change.
- Do not leave root `ROADMAP.md` / `TODO.md` as the only truth — prefer `docs/ROADMAP.md` for product slices.

---

## Performance expectations

- Avoid unnecessary re-renders in hot gym/logger paths; prefer simple state over premature memo unless the codebase already relies on it.
- Active flows: timestamp-based timers (not drift-prone counters alone).
- Local writes first; cloud sync must not block logging UX.
- Keep snapshots reasonably cheap; do not refetch the world on every keystroke.

---

## Accessibility

- Interactive controls ≥ **44px** touch targets on mobile-critical UIs.
- Visible focus styles; labelled inputs (`label` / `aria-label`).
- Do not rely on colour alone for sync/error state.
- Keyboard operable dialogs and primary actions.
- No horizontal overflow on ~390px specialist loggers.

---

## No duplicated business logic

- Volume, progression, e1RM, adherence, status filters live in domain modules — UI displays results.
- If two components need the same rule, extract to `lib/specialists/...` or the relevant engine.
- Kernel subscribers must not reimplement specialist rules; they react to events.

---

## No direct database access from components

```
❌ components/gym/Foo.tsx → createClient().from('gym_…')
✅ components → useGymData / saveActiveWorkout → repository → local/Supabase
```

API routes may use server Supabase clients for classic tables and AI tooling, still behind `requireAuth` and RLS.

---

## Repository-first architecture

1. Types  
2. Repository interface  
3. Local implementation (+ migrate)  
4. Context API  
5. Components  
6. Optional Supabase + SQL + sync  
7. Tests + docs  

Skipping straight to UI + ad-hoc `localStorage` keys is only acceptable for throwaway prototypes — not for specialist product surfaces.

---

## Related reading

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DOMAIN_FRAMEWORK.md](./DOMAIN_FRAMEWORK.md)
- [WORKFLOW.md](./WORKFLOW.md)
