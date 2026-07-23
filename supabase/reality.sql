-- FounderOS Reality Engine schema (rerunnable, RLS-safe)
-- Stores a versioned reality datastore JSON blob per user for migration flexibility.
-- Distinct from cognitive-model belief Reality tables (if added later).

create extension if not exists pgcrypto;

create table if not exists reality_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  datastore jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table reality_profiles is
  'Reality Engine primary cloud store. Live events, aggregations, and snapshot cache live in datastore JSON.';

create index if not exists idx_reality_profiles_updated
  on reality_profiles(updated_at desc);

-- Optional relational event index for future analytics / cross-user ops (not required by v1 engine).
create table if not exists reality_events_index (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  domain text,
  event_type text,
  title text,
  occurred_at timestamptz,
  importance real,
  confidence real,
  created_at timestamptz not null default now()
);

create index if not exists idx_reality_events_index_user
  on reality_events_index(user_id, occurred_at desc);

create table if not exists reality_evidence_index (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text,
  source_kind text,
  summary text not null,
  observed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reality_evidence_index_user
  on reality_evidence_index(user_id);

alter table reality_profiles enable row level security;
alter table reality_events_index enable row level security;
alter table reality_evidence_index enable row level security;

drop policy if exists "reality_profiles_select_own" on reality_profiles;
create policy "reality_profiles_select_own" on reality_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "reality_profiles_insert_own" on reality_profiles;
create policy "reality_profiles_insert_own" on reality_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "reality_profiles_update_own" on reality_profiles;
create policy "reality_profiles_update_own" on reality_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reality_profiles_delete_own" on reality_profiles;
create policy "reality_profiles_delete_own" on reality_profiles
  for delete using (auth.uid() = user_id);

drop policy if exists "reality_events_index_select_own" on reality_events_index;
create policy "reality_events_index_select_own" on reality_events_index
  for select using (auth.uid() = user_id);

drop policy if exists "reality_events_index_insert_own" on reality_events_index;
create policy "reality_events_index_insert_own" on reality_events_index
  for insert with check (auth.uid() = user_id);

drop policy if exists "reality_events_index_update_own" on reality_events_index;
create policy "reality_events_index_update_own" on reality_events_index
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reality_events_index_delete_own" on reality_events_index;
create policy "reality_events_index_delete_own" on reality_events_index
  for delete using (auth.uid() = user_id);

drop policy if exists "reality_evidence_index_select_own" on reality_evidence_index;
create policy "reality_evidence_index_select_own" on reality_evidence_index
  for select using (auth.uid() = user_id);

drop policy if exists "reality_evidence_index_insert_own" on reality_evidence_index;
create policy "reality_evidence_index_insert_own" on reality_evidence_index
  for insert with check (auth.uid() = user_id);

drop policy if exists "reality_evidence_index_update_own" on reality_evidence_index;
create policy "reality_evidence_index_update_own" on reality_evidence_index
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reality_evidence_index_delete_own" on reality_evidence_index;
create policy "reality_evidence_index_delete_own" on reality_evidence_index
  for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reality_profiles_set_updated_at on reality_profiles;
create trigger reality_profiles_set_updated_at
before update on reality_profiles
for each row execute function public.set_updated_at();
