-- ============================================================================
-- FounderOS — World types migration (projects → Worlds language)
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Safe to re-run: uses "if not exists" guards.
-- ============================================================================

alter table projects add column if not exists world_type text default 'Custom';
alter table projects add column if not exists world_purpose text;
alter table projects add column if not exists life_area text;

update projects set world_type = 'Custom' where world_type is null;

create index if not exists idx_projects_world_type on projects(world_type);
