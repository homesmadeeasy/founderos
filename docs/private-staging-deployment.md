# Private staging deployment

This guide prepares FounderOS for a **private live staging** deployment on Vercel while preserving local development. It does **not** mean staging has already been deployed.

Gym cloud persistence (database tables, sync queue, local import UI) is a later phase. Phase 1 only covers environment boundaries, auth route protection, docs, and verification scripts.

## Environments

| Environment | Typical host | `NEXT_PUBLIC_APP_ENV` | Notes |
|-------------|--------------|------------------------|--------|
| **Local** | `http://localhost:3000` | `local` | Cursor + `npm run dev`; `.env.local` |
| **Private staging** | `https://<project>.vercel.app` (or custom) | `staging` | Owner-only accounts; Staging badge in Settings |
| **Production** | TBD | `production` | Not launched yet |

Same codebase for all three. Do not hard-code origins or ports in application code.

## Required environment variables

Copy `.env.example` → `.env.local` for local work. Configure the same names in Vercel for staging.

### Public (safe in the browser)

| Name | Required | Purpose |
|------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anon key (RLS-protected) |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical origin, no trailing slash (e.g. `https://your-app.vercel.app`) |
| `NEXT_PUBLIC_APP_ENV` | Recommended | `local` \| `staging` \| `production` |

### Server-only (never `NEXT_PUBLIC_`)

| Name | Required | Purpose |
|------|----------|---------|
| `OPENAI_API_KEY` | Optional* | AI API routes; Founder AI falls back when absent |
| `OPENAI_FOUNDER_MODEL` | Optional | Default `gpt-4o-mini` |
| `GOOGLE_CLIENT_ID` | Optional | Google Calendar OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional | Google Calendar OAuth |
| `GOOGLE_REDIRECT_URI` | Optional | Must match the environment origin |

\*Some legacy AI routes return 500 without a key; Founder AI does **not** crash the app when the key is missing.

**Do not use** `SUPABASE_SERVICE_ROLE_KEY` in this app. Auth + RLS + anon key only.

Secret files (`.env.local`, `.env.production.local`, etc.) are gitignored via `.env*` with `.env.example` allowed.

## Supabase Auth URLs

In **Supabase Dashboard → Authentication → URL Configuration**:

### Local

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:**  
  - `http://localhost:3000/**`  
  - `http://localhost:3000/login`  
  - `http://localhost:3000/signup`

### Staging

- **Site URL:** your staging origin (same as `NEXT_PUBLIC_APP_URL`)
- **Redirect URLs:**  
  - `https://<your-staging-host>/**`  
  - `https://<your-staging-host>/login`  
  - `https://<your-staging-host>/signup`

If email confirmation is enabled, confirmation links must use the staging Site URL, not localhost.

### Private access (staging)

- Keep **public sign-ups disabled** unless you explicitly want them.
- Create only the owner (and any intended testers) as users.
- Do not rely on a custom allow-list in app code for Phase 1 — Supabase account control is enough.

## GitHub setup

1. Ensure the FounderOS app lives in the GitHub repo you will connect to Vercel.
2. Confirm `.env.local` and secrets are **not** committed (`git status` / `.gitignore`).
3. Prefer deploying from `main` or a dedicated `staging` branch after review.

## Vercel setup (manual — not done by this milestone)

1. Import the GitHub repository in Vercel.
2. Set **Root Directory** to the Next.js app folder if the repo contains a parent wrapper (e.g. `founderos/`).
3. Add environment variables (names above) for the Preview/Production environment you use as staging.
4. Set `NEXT_PUBLIC_APP_ENV=staging` and `NEXT_PUBLIC_APP_URL` to the deployed HTTPS origin.
5. Deploy. Note the resulting URL — it is **not** created by Cursor automatically.
6. Update Supabase Site URL / Redirect URLs to match that origin.
7. Sign in on desktop and phone; open Settings and confirm the **Staging** badge appears.

## Verification checklist

- [ ] `npm run check` passes locally
- [ ] Unauthenticated visit to `/gym` redirects to `/login?redirect=/gym`
- [ ] Authenticated user can open `/gym` (and onboarding gate still applies)
- [ ] Missing `OPENAI_API_KEY` does not crash the app shell; Founder AI uses deterministic fallback
- [ ] No service-role key in client bundle or env templates
- [ ] Staging badge only when `NEXT_PUBLIC_APP_ENV=staging`

## Rollback

1. In Vercel, promote/redeploy the previous successful deployment.
2. Revert Supabase Auth Site URL / redirects if they were changed incorrectly.
3. Application data for Gym remains localStorage-only until a later persistence phase — rolling back Phase 1 does not require database migrations.

## What is intentionally out of scope (later phases)

- Gym Supabase tables and RLS
- `SupabaseGymRepository` and offline sync queue
- Local → cloud Gym import UI
- Production launch and public sign-up

## Commands

```bash
npm run typecheck
npm run test:env
npm run check   # typecheck + core tests + env tests + production build
```
