-- ============================================================================
-- FounderOS — Project Review Mode migration
-- Adds the project_reviews table used by /projects/[id]/review.
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- This does NOT modify any existing table.
-- ============================================================================

create table if not exists project_reviews (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  project_id              uuid not null references projects(id) on delete cascade,
  summary                 text,
  progress_review         text,
  completed_work          text,
  blockers                text,
  key_risks               text,
  key_decisions           text,
  next_7_day_plan         text,
  suggested_tasks         jsonb default '[]'::jsonb,
  suggested_roadmap_items jsonb default '[]'::jsonb,
  created_at              timestamptz default now()
);

-- Index for the "reviews for this project, newest first" query.
create index if not exists idx_project_reviews_project on project_reviews(project_id);
create index if not exists idx_project_reviews_user    on project_reviews(user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table project_reviews enable row level security;

drop policy if exists "project_reviews_select_own" on project_reviews;
drop policy if exists "project_reviews_insert_own" on project_reviews;
drop policy if exists "project_reviews_update_own" on project_reviews;
drop policy if exists "project_reviews_delete_own" on project_reviews;

create policy "project_reviews_select_own" on project_reviews
  for select using (auth.uid() = user_id);
create policy "project_reviews_insert_own" on project_reviews
  for insert with check (auth.uid() = user_id);
create policy "project_reviews_update_own" on project_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "project_reviews_delete_own" on project_reviews
  for delete using (auth.uid() = user_id);
