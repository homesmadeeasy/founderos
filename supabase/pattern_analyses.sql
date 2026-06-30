-- ============================================================================
-- FounderOS — Cross-Project Pattern Analysis migration
-- Adds the pattern_analyses table used by /patterns.
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- Also extends links entity-type checks to include pattern_analysis.
-- ============================================================================

create table if not exists pattern_analyses (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  summary                   text,
  recurring_strengths       text,
  recurring_weaknesses      text,
  execution_patterns        text,
  idea_patterns             text,
  risk_patterns             text,
  decision_patterns         text,
  project_momentum_patterns text,
  bottlenecks               text,
  opportunities             text,
  recommended_changes       text,
  suggested_actions         jsonb default '[]'::jsonb,
  created_at                timestamptz default now()
);

create index if not exists idx_pattern_analyses_user on pattern_analyses(user_id);
create index if not exists idx_pattern_analyses_created on pattern_analyses(created_at desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table pattern_analyses enable row level security;

drop policy if exists "pattern_analyses_select_own" on pattern_analyses;
drop policy if exists "pattern_analyses_insert_own" on pattern_analyses;
drop policy if exists "pattern_analyses_update_own" on pattern_analyses;
drop policy if exists "pattern_analyses_delete_own" on pattern_analyses;

create policy "pattern_analyses_select_own" on pattern_analyses
  for select using (auth.uid() = user_id);
create policy "pattern_analyses_insert_own" on pattern_analyses
  for insert with check (auth.uid() = user_id);
create policy "pattern_analyses_update_own" on pattern_analyses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pattern_analyses_delete_own" on pattern_analyses
  for delete using (auth.uid() = user_id);

-- ─── Extend links entity types ────────────────────────────────────────────────

alter table links drop constraint if exists links_source_type_check;
alter table links drop constraint if exists links_target_type_check;

alter table links add constraint links_source_type_check check (source_type in (
  'idea', 'idea_analysis', 'project', 'conversation', 'message',
  'task', 'note', 'decision', 'risk', 'roadmap_item',
  'project_review', 'project_file', 'weekly_review', 'project_dna', 'pattern_analysis'
));

alter table links add constraint links_target_type_check check (target_type in (
  'idea', 'idea_analysis', 'project', 'conversation', 'message',
  'task', 'note', 'decision', 'risk', 'roadmap_item',
  'project_review', 'project_file', 'weekly_review', 'project_dna', 'pattern_analysis'
));
