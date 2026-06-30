# FounderOS TODO

Practical backlog — not a full product roadmap.

## Bugs to fix

- [ ] Settings page profile fields are placeholders (read from `profiles` table)
- [ ] `/api/command` is a stub — wire up or remove
- [ ] Some project sub-pages use inline empty UI instead of shared `EmptyState`

## Polish

- [ ] Migrate remaining API routes to `lib/ai/server.ts` helpers
- [ ] Use `SectionCard` and `PageHeader` consistently across pages
- [ ] Add retry buttons on more AI generation failures
- [ ] Show env setup hint on dashboard when Supabase/OpenAI misconfigured

## Technical debt

- [ ] Add Zod schemas for API request bodies
- [ ] Add `npm run typecheck` script
- [ ] Consider server components for initial data loading on heavy pages
- [ ] Add basic integration tests for db mappers

## Future features (not started)

- Vector search / semantic memory
- Calendar and Gmail integrations
- Payments / billing
- Browser extension
- Mobile app
- Autonomous background agents

## Recommended next feature

**Focus mode / project priorities** — help users narrow to 1–2 active projects using existing pattern analysis and weekly review data (no new backend systems required).
