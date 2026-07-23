-- FounderOS Identity Engine schema (rerunnable, RLS-safe)
-- Stores a versioned identity datastore JSON blob per user for migration flexibility.
-- Relational projections can be added later without breaking the engine contract.

create extension if not exists pgcrypto;

create table if not exists identity_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  datastore jsonb not null default '{}'::jsonb,
  onboarding_complete boolean not null default false,
  enabled_specialists jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table identity_profiles is
  'Identity Engine primary cloud store. Domain truth lives in datastore JSON (facts, evidence, history).';

create index if not exists idx_identity_profiles_updated
  on identity_profiles(updated_at desc);

-- Optional relational evidence index for future analytics (not required by v1 engine).
create table if not exists identity_evidence_index (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_key text,
  source_kind text,
  summary text not null,
  observed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_identity_evidence_index_user
  on identity_evidence_index(user_id);

alter table identity_profiles enable row level security;
alter table identity_evidence_index enable row level security;

drop policy if exists "identity_profiles_select_own" on identity_profiles;
create policy "identity_profiles_select_own" on identity_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "identity_profiles_insert_own" on identity_profiles;
create policy "identity_profiles_insert_own" on identity_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "identity_profiles_update_own" on identity_profiles;
create policy "identity_profiles_update_own" on identity_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "identity_profiles_delete_own" on identity_profiles;
create policy "identity_profiles_delete_own" on identity_profiles
  for delete using (auth.uid() = user_id);

drop policy if exists "identity_evidence_index_select_own" on identity_evidence_index;
create policy "identity_evidence_index_select_own" on identity_evidence_index
  for select using (auth.uid() = user_id);

drop policy if exists "identity_evidence_index_insert_own" on identity_evidence_index;
create policy "identity_evidence_index_insert_own" on identity_evidence_index
  for insert with check (auth.uid() = user_id);

drop policy if exists "identity_evidence_index_update_own" on identity_evidence_index;
create policy "identity_evidence_index_update_own" on identity_evidence_index
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "identity_evidence_index_delete_own" on identity_evidence_index;
create policy "identity_evidence_index_delete_own" on identity_evidence_index
  for delete using (auth.uid() = user_id);

-- updated_at helper (shared with other schemas when present)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_identity_profiles_updated_at on identity_profiles;
create trigger trg_identity_profiles_updated_at
  before update on identity_profiles
  for each row execute function public.set_updated_at();
