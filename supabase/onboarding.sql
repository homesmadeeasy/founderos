-- ============================================================================
-- FounderOS — Onboarding & demo workspace migration
-- Paste into Supabase SQL Editor and run once.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- ============================================================================

alter table profiles add column if not exists onboarding_completed boolean default false;
alter table profiles add column if not exists demo_workspace_loaded boolean default false;

-- Existing users with workspace data are treated as already onboarded.
update profiles
set onboarding_completed = true
where onboarding_completed = false
  and id in (
    select distinct user_id from projects
    union
    select distinct user_id from ideas
  );
