-- ============================================================================
-- FounderOS — Goals Engine migration
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Requires: core schema.sql
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- ============================================================================

-- ─── goals ────────────────────────────────────────────────────────────────────

create table if not exists goals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  description       text,
  category          text default 'Other',
  priority          text default 'Medium',
  status            text default 'Active',
  progress          integer default 0,
  timeframe         text,
  success_criteria  text,
  why_it_matters    text,
  constraints       text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists idx_goals_user on goals(user_id);
create index if not exists idx_goals_status on goals(status);

alter table goals enable row level security;

drop policy if exists "goals_select_own" on goals;
create policy "goals_select_own" on goals for select using (auth.uid() = user_id);

drop policy if exists "goals_insert_own" on goals;
create policy "goals_insert_own" on goals for insert with check (auth.uid() = user_id);

drop policy if exists "goals_update_own" on goals;
create policy "goals_update_own" on goals for update using (auth.uid() = user_id);

drop policy if exists "goals_delete_own" on goals;
create policy "goals_delete_own" on goals for delete using (auth.uid() = user_id);

-- ─── goal_links ───────────────────────────────────────────────────────────────

create table if not exists goal_links (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  goal_id           uuid not null references goals(id) on delete cascade,
  entity_type       text not null,
  entity_id         uuid not null,
  relationship_type text default 'supports',
  created_at        timestamptz default now()
);

create index if not exists idx_goal_links_goal on goal_links(goal_id);
create index if not exists idx_goal_links_entity on goal_links(entity_type, entity_id);

alter table goal_links enable row level security;

drop policy if exists "goal_links_select_own" on goal_links;
create policy "goal_links_select_own" on goal_links for select using (auth.uid() = user_id);

drop policy if exists "goal_links_insert_own" on goal_links;
create policy "goal_links_insert_own" on goal_links for insert with check (auth.uid() = user_id);

drop policy if exists "goal_links_update_own" on goal_links;
create policy "goal_links_update_own" on goal_links for update using (auth.uid() = user_id);

drop policy if exists "goal_links_delete_own" on goal_links;
create policy "goal_links_delete_own" on goal_links for delete using (auth.uid() = user_id);

-- ─── goal_reviews ─────────────────────────────────────────────────────────────

create table if not exists goal_reviews (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  goal_id           uuid not null references goals(id) on delete cascade,
  progress_review   text,
  blockers          text,
  conflicts         text,
  next_actions      text,
  recommended_focus text,
  confidence_score  integer default 50,
  suggested_tasks   jsonb default '[]'::jsonb,
  created_at        timestamptz default now()
);

create index if not exists idx_goal_reviews_goal on goal_reviews(goal_id);

alter table goal_reviews enable row level security;

drop policy if exists "goal_reviews_select_own" on goal_reviews;
create policy "goal_reviews_select_own" on goal_reviews for select using (auth.uid() = user_id);

drop policy if exists "goal_reviews_insert_own" on goal_reviews;
create policy "goal_reviews_insert_own" on goal_reviews for insert with check (auth.uid() = user_id);

drop policy if exists "goal_reviews_update_own" on goal_reviews;
create policy "goal_reviews_update_own" on goal_reviews for update using (auth.uid() = user_id);

drop policy if exists "goal_reviews_delete_own" on goal_reviews;
create policy "goal_reviews_delete_own" on goal_reviews for delete using (auth.uid() = user_id);
