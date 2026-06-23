-- ============================================================================
-- FounderOS — Global Weekly Review migration
-- Adds the weekly_reviews table used by /weekly-review.
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- Also extends links entity-type checks to include weekly_review.
-- ============================================================================

create table if not exists weekly_reviews (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  week_start                 date not null,
  week_end                   date not null,
  summary                    text,
  completed_work             text,
  active_projects            text,
  stuck_projects             text,
  key_decisions              text,
  key_risks                  text,
  ideas_to_revisit           text,
  files_added                text,
  memory_insights            text,
  next_week_focus            text,
  suggested_tasks            jsonb default '[]'::jsonb,
  suggested_project_reviews  jsonb default '[]'::jsonb,
  created_at                 timestamptz default now()
);

create index if not exists idx_weekly_reviews_user on weekly_reviews(user_id);
create index if not exists idx_weekly_reviews_created on weekly_reviews(created_at desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table weekly_reviews enable row level security;

drop policy if exists "weekly_reviews_select_own" on weekly_reviews;
drop policy if exists "weekly_reviews_insert_own" on weekly_reviews;
drop policy if exists "weekly_reviews_update_own" on weekly_reviews;
drop policy if exists "weekly_reviews_delete_own" on weekly_reviews;

create policy "weekly_reviews_select_own" on weekly_reviews
  for select using (auth.uid() = user_id);
create policy "weekly_reviews_insert_own" on weekly_reviews
  for insert with check (auth.uid() = user_id);
create policy "weekly_reviews_update_own" on weekly_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_reviews_delete_own" on weekly_reviews
  for delete using (auth.uid() = user_id);

-- ─── Extend links entity types ────────────────────────────────────────────────

alter table links drop constraint if exists links_source_type_check;
alter table links drop constraint if exists links_target_type_check;

alter table links add constraint links_source_type_check check (source_type in (
  'idea', 'idea_analysis', 'project', 'conversation', 'message',
  'task', 'note', 'decision', 'risk', 'roadmap_item',
  'project_review', 'project_file', 'weekly_review'
));

alter table links add constraint links_target_type_check check (target_type in (
  'idea', 'idea_analysis', 'project', 'conversation', 'message',
  'task', 'note', 'decision', 'risk', 'roadmap_item',
  'project_review', 'project_file', 'weekly_review'
));
