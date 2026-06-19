-- ============================================================================
-- FounderOS — Supabase schema
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- ============================================================================

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz default now()
);

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  goal        text,
  status      text default 'idea',
  priority    text default 'medium',
  progress    integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  title       text,
  created_at  timestamptz default now()
);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  created_at      timestamptz default now()
);

create table if not exists tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  project_id        uuid not null references projects(id) on delete cascade,
  title             text not null,
  description       text,
  status            text default 'todo',
  priority          text default 'medium',
  due_date          date,
  source_message_id uuid references messages(id) on delete set null,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  project_id        uuid not null references projects(id) on delete cascade,
  title             text not null,
  content           text,
  source_message_id uuid references messages(id) on delete set null,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists decisions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  project_id        uuid not null references projects(id) on delete cascade,
  decision          text not null,
  reasoning         text,
  source_message_id uuid references messages(id) on delete set null,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists risks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  severity    text default 'medium',
  mitigation  text,
  status      text default 'open',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists roadmap_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  stage       text,
  status      text default 'planned',
  sort_order  integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Helpful indexes for the per-project queries the app makes.
create index if not exists idx_projects_user        on projects(user_id);
create index if not exists idx_messages_project      on messages(project_id);
create index if not exists idx_tasks_project         on tasks(project_id);
create index if not exists idx_notes_project         on notes(project_id);
create index if not exists idx_decisions_project     on decisions(project_id);
create index if not exists idx_risks_project         on risks(project_id);
create index if not exists idx_roadmap_items_project on roadmap_items(project_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table profiles      enable row level security;
alter table projects      enable row level security;
alter table conversations enable row level security;
alter table messages      enable row level security;
alter table tasks         enable row level security;
alter table notes         enable row level security;
alter table decisions     enable row level security;
alter table risks         enable row level security;
alter table roadmap_items enable row level security;

-- profiles: a user can only see/insert/update their own profile row.
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Generic owner policy for every user-owned table:
-- a user may select/insert/update/delete only rows where user_id = auth.uid().
do $$
declare
  t text;
begin
  foreach t in array array[
    'projects','conversations','messages','tasks','notes','decisions','risks','roadmap_items'
  ]
  loop
    execute format('drop policy if exists "%s_select_own" on %I', t, t);
    execute format('drop policy if exists "%s_insert_own" on %I', t, t);
    execute format('drop policy if exists "%s_update_own" on %I', t, t);
    execute format('drop policy if exists "%s_delete_own" on %I', t, t);

    execute format('create policy "%s_select_own" on %I for select using (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_insert_own" on %I for insert with check (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_update_own" on %I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_delete_own" on %I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;

-- ─── Auto-create a profile when a new auth user signs up ───────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
