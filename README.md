# FounderOS

FounderOS is an AI operating system that turns your ideas, chats, notes and files into structured projects, tasks, decisions, risks, roadmaps and progress.

Built for young founders, builders, coders and ambitious students who want more than a blank ChatGPT window.

## Current features

- Supabase auth and database persistence
- Project-scoped AI chat with structured context
- AI extraction (tasks, notes, decisions, risks, roadmap items)
- Idea Vault with AI idea analysis and idea-to-project flow
- Project reviews and global weekly reviews
- Project DNA and cross-project pattern detection
- Knowledge graph / linked memory
- File upload with AI summaries
- Global command bar (⌘K)
- Onboarding, demo workspace and product clarity flows

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React, Tailwind CSS
- **Database & auth:** Supabase (PostgreSQL + RLS)
- **AI:** OpenAI API (`gpt-4o-mini`)

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

These are validated server-side on AI routes. Missing values return clear developer errors in API responses.

### 3. Supabase setup

Run the SQL migrations in order (see `supabase/README.md`):

1. `schema.sql` — core tables
2. Feature migrations as needed (`ideas.sql`, `links.sql`, etc.)

Enable email auth in your Supabase project. RLS policies are included in the migration files.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build + typecheck |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Basic testing checklist

- [ ] Sign up / log in
- [ ] Complete onboarding or load demo workspace
- [ ] Create idea → analyse → convert to project
- [ ] Project chat → extract task/note/decision
- [ ] Generate project review and weekly review
- [ ] Upload file and view memory graph
- [ ] Generate Project DNA and pattern analysis
- [ ] Command bar search and navigation

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set the same environment variables
4. Deploy

Ensure all Supabase migrations have been applied to your production Supabase project before going live.

## Project structure

```
app/           Next.js routes (pages + API)
components/    React UI components
contexts/      App-wide React state
lib/           Business logic, AI helpers, Supabase data layer
supabase/      SQL migrations
```

See `DEVELOPMENT.md` for architecture details.
