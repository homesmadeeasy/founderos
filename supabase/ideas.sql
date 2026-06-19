-- ============================================================================
-- FounderOS — Idea Vault + Idea Architect migration
-- Adds the `ideas` and `idea_analyses` tables.
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- This does NOT modify any existing table.
-- ============================================================================

-- ─── ideas ────────────────────────────────────────────────────────────────────

create table if not exists ideas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  description      text,
  target_user      text,
  problem          text,
  solution         text,
  potential_score  integer default 5,
  difficulty_score integer default 5,
  status           text default 'Raw',
  tags             text[] default '{}',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─── idea_analyses ─────────────────────────────────────────────────────────────

create table if not exists idea_analyses (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  idea_id                 uuid not null references ideas(id) on delete cascade,
  summary                 text,
  target_user_analysis    text,
  problem_analysis        text,
  market_potential        text,
  difficulty_analysis     text,
  risks                   text,
  mvp_suggestion          text,
  validation_plan         text,
  next_steps              text,
  suggested_project       jsonb,
  suggested_tasks         jsonb default '[]'::jsonb,
  suggested_risks         jsonb default '[]'::jsonb,
  suggested_roadmap_items jsonb default '[]'::jsonb,
  created_at              timestamptz default now()
);

create index if not exists idx_ideas_user            on ideas(user_id);
create index if not exists idx_idea_analyses_idea     on idea_analyses(idea_id);
create index if not exists idx_idea_analyses_user     on idea_analyses(user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table ideas         enable row level security;
alter table idea_analyses enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['ideas', 'idea_analyses']
  loop
    execute format('drop policy if exists "%s_select_own" on %I', t, t);
    execute format('drop policy if exists "%s_insert_own" on %I', t, t);
    execute format('drop policy if exists "%s_update_own" on %I', t, t);
    execute format('drop policy if exists "%s_delete_own" on %I', t, t);

    execute format('create policy "%s_select_own" on %I for select using (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_insert_own" on %I for insert with check (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_update_own" on %I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_delete_own" on %I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;
