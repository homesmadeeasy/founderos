-- ============================================================================
-- FounderOS — Project DNA migration
-- Adds the project_dna table used by /projects/[id]/dna.
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- Also extends links entity-type checks to include project_dna.
-- ============================================================================

create table if not exists project_dna (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  project_id           uuid not null references projects(id) on delete cascade,
  origin               text,
  core_goal            text,
  current_direction    text,
  major_decisions      text,
  recurring_risks      text,
  momentum_pattern     text,
  lessons_learned      text,
  next_strategic_move  text,
  dna_summary          text,
  confidence_score     integer default 50,
  created_at           timestamptz default now()
);

create index if not exists idx_project_dna_project on project_dna(project_id);
create index if not exists idx_project_dna_user on project_dna(user_id);
create index if not exists idx_project_dna_created on project_dna(created_at desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table project_dna enable row level security;

drop policy if exists "project_dna_select_own" on project_dna;
drop policy if exists "project_dna_insert_own" on project_dna;
drop policy if exists "project_dna_update_own" on project_dna;
drop policy if exists "project_dna_delete_own" on project_dna;

create policy "project_dna_select_own" on project_dna
  for select using (auth.uid() = user_id);
create policy "project_dna_insert_own" on project_dna
  for insert with check (auth.uid() = user_id);
create policy "project_dna_update_own" on project_dna
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "project_dna_delete_own" on project_dna
  for delete using (auth.uid() = user_id);

-- ─── Extend links entity types ────────────────────────────────────────────────

alter table links drop constraint if exists links_source_type_check;
alter table links drop constraint if exists links_target_type_check;

alter table links add constraint links_source_type_check check (source_type in (
  'idea', 'idea_analysis', 'project', 'conversation', 'message',
  'task', 'note', 'decision', 'risk', 'roadmap_item',
  'project_review', 'project_file', 'weekly_review', 'project_dna'
));

alter table links add constraint links_target_type_check check (target_type in (
  'idea', 'idea_analysis', 'project', 'conversation', 'message',
  'task', 'note', 'decision', 'risk', 'roadmap_item',
  'project_review', 'project_file', 'weekly_review', 'project_dna'
));
