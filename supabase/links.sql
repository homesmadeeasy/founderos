-- ============================================================================
-- FounderOS — Knowledge Graph / Linked Memory migration
-- Adds the `links` table that connects entities across the app.
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- This does NOT modify any existing table.
-- ============================================================================

create table if not exists links (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  source_type       text not null check (source_type in (
    'idea','idea_analysis','project','conversation','message',
    'task','note','decision','risk','roadmap_item','project_review'
  )),
  source_id         uuid not null,
  target_type       text not null check (target_type in (
    'idea','idea_analysis','project','conversation','message',
    'task','note','decision','risk','roadmap_item','project_review'
  )),
  target_id         uuid not null,
  relationship_type text not null check (relationship_type in (
    'created_from','converted_to','suggested_by','supports','blocks',
    'relates_to','caused_by','resolves','depends_on','part_of'
  )),
  description       text,
  created_at        timestamptz default now()
);

create index if not exists idx_links_user   on links(user_id);
create index if not exists idx_links_source on links(source_type, source_id);
create index if not exists idx_links_target on links(target_type, target_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table links enable row level security;

drop policy if exists "links_select_own" on links;
drop policy if exists "links_insert_own" on links;
drop policy if exists "links_update_own" on links;
drop policy if exists "links_delete_own" on links;

create policy "links_select_own" on links for select using (auth.uid() = user_id);
create policy "links_insert_own" on links for insert with check (auth.uid() = user_id);
create policy "links_update_own" on links for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "links_delete_own" on links for delete using (auth.uid() = user_id);
