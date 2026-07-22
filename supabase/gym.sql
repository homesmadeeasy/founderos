-- ============================================================================
-- FounderOS — Gym durable storage migration (Phase 2)
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Requires: core schema.sql (auth.users). Does not require goals.sql.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" /
-- "create or replace function" / "drop trigger if exists" guards.
--
-- Maps to domain types in lib/specialists/gym/gymStorage/gymStorageTypes.ts:
--   GymProfile, WorkoutTemplate, ApprovedWorkoutPlan, ActiveWorkout,
--   WorkoutSessionRecord, ExercisePerformanceRecord, SetPerformanceRecord,
--   ProgressionRecord.
--
-- Cloud primary keys are UUIDs (project convention). Local string IDs
-- (e.g. conv-…) are mapped in a later repository phase — not in this file.
--
-- Do NOT disable RLS. Do NOT use a service-role key from the app.
-- ============================================================================

-- ─── updated_at helper ────────────────────────────────────────────────────────
-- Existing migrations store updated_at columns but do not define a shared
-- trigger helper. Gym tables introduce one reusable trigger function.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets NEW.updated_at = now() on row update. Shared by Gym (and future) tables.';

-- ─── gym_profiles ─────────────────────────────────────────────────────────────
-- One training profile per authenticated user (GymProfile).

create table if not exists gym_profiles (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  complete                    boolean not null default false,
  first_session_choice_complete boolean not null default false,
  first_session_intent        text check (
    first_session_intent is null
    or first_session_intent in ('today', 'tomorrow')
  ),
  primary_goal                text not null,
  experience                  text not null check (
    experience in ('beginner', 'intermediate', 'advanced')
  ),
  age                         integer,
  height_cm                   numeric,
  weight_kg                   numeric,
  training_days_per_week      integer not null,
  session_duration_minutes    integer not null,
  preferred_split             text not null,
  tracking_mode               text not null check (
    tracking_mode in ('rpe', 'rir', 'simple')
  ),
  smallest_load_increment_kg  numeric not null default 2.5,
  -- Flexible arrays / maps from GymProfile (Equipment[], MuscleGroup[], etc.)
  equipment                   jsonb not null default '[]'::jsonb,
  exercises_enjoy             jsonb not null default '[]'::jsonb,
  exercises_dislike           jsonb not null default '[]'::jsonb,
  injury_limitations          jsonb not null default '[]'::jsonb,
  target_muscles              jsonb not null default '[]'::jsonb,
  body_measurements           jsonb,
  estimated_one_rep_maxes     jsonb not null default '{}'::jsonb,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint gym_profiles_user_unique unique (user_id)
);

comment on table gym_profiles is
  'Per-user Gym training profile. JSONB used only for list/map fields that are arrays or open-ended records in GymProfile.';

create index if not exists idx_gym_profiles_user on gym_profiles(user_id);

drop trigger if exists trg_gym_profiles_updated_at on gym_profiles;
create trigger trg_gym_profiles_updated_at
  before update on gym_profiles
  for each row execute function public.set_updated_at();

alter table gym_profiles enable row level security;

drop policy if exists "gym_profiles_select_own" on gym_profiles;
create policy "gym_profiles_select_own" on gym_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "gym_profiles_insert_own" on gym_profiles;
create policy "gym_profiles_insert_own" on gym_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "gym_profiles_update_own" on gym_profiles;
create policy "gym_profiles_update_own" on gym_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gym_profiles_delete_own" on gym_profiles;
create policy "gym_profiles_delete_own" on gym_profiles
  for delete using (auth.uid() = user_id);

-- ─── gym_workout_templates ────────────────────────────────────────────────────
-- Saved / reusable workout templates (WorkoutTemplate + optional status/metadata).

create table if not exists gym_workout_templates (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  goal                text not null,
  status              text not null default 'active',
  split               text,
  estimated_minutes   integer,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table gym_workout_templates is
  'User-owned workout templates. Child exercises live in gym_workout_template_exercises.';

create index if not exists idx_gym_workout_templates_user on gym_workout_templates(user_id);
create index if not exists idx_gym_workout_templates_status on gym_workout_templates(user_id, status);

drop trigger if exists trg_gym_workout_templates_updated_at on gym_workout_templates;
create trigger trg_gym_workout_templates_updated_at
  before update on gym_workout_templates
  for each row execute function public.set_updated_at();

alter table gym_workout_templates enable row level security;

drop policy if exists "gym_workout_templates_select_own" on gym_workout_templates;
create policy "gym_workout_templates_select_own" on gym_workout_templates
  for select using (auth.uid() = user_id);

drop policy if exists "gym_workout_templates_insert_own" on gym_workout_templates;
create policy "gym_workout_templates_insert_own" on gym_workout_templates
  for insert with check (auth.uid() = user_id);

drop policy if exists "gym_workout_templates_update_own" on gym_workout_templates;
create policy "gym_workout_templates_update_own" on gym_workout_templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gym_workout_templates_delete_own" on gym_workout_templates;
create policy "gym_workout_templates_delete_own" on gym_workout_templates
  for delete using (auth.uid() = user_id);

-- ─── gym_workout_template_exercises ───────────────────────────────────────────
-- Ordered prescription rows for a template. No user_id column — ownership is
-- proven only through the parent template (prevents trusting a forged user_id).

create table if not exists gym_workout_template_exercises (
  id                      uuid primary key default gen_random_uuid(),
  template_id             uuid not null references gym_workout_templates(id) on delete cascade,
  exercise_id             text not null,
  planned_exercise_id     text,
  exercise_order          integer not null,
  prescribed_sets         integer,
  rep_min                 integer,
  rep_max                 integer,
  target_rpe              numeric,
  target_rir              numeric,
  rest_seconds            integer,
  prescription_metadata   jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint gym_template_exercises_order_unique unique (template_id, exercise_order)
);

comment on table gym_workout_template_exercises is
  'Template exercise prescriptions. RLS is parent-scoped via gym_workout_templates — no denormalised user_id.';

create index if not exists idx_gym_template_exercises_template
  on gym_workout_template_exercises(template_id);

create unique index if not exists idx_gym_template_exercises_planned_id
  on gym_workout_template_exercises(template_id, planned_exercise_id)
  where planned_exercise_id is not null;

drop trigger if exists trg_gym_workout_template_exercises_updated_at on gym_workout_template_exercises;
create trigger trg_gym_workout_template_exercises_updated_at
  before update on gym_workout_template_exercises
  for each row execute function public.set_updated_at();

alter table gym_workout_template_exercises enable row level security;

-- Policy decision: authorise exclusively via parent template ownership.
drop policy if exists "gym_template_exercises_select_own" on gym_workout_template_exercises;
create policy "gym_template_exercises_select_own" on gym_workout_template_exercises
  for select using (
    exists (
      select 1 from gym_workout_templates t
      where t.id = template_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "gym_template_exercises_insert_own" on gym_workout_template_exercises;
create policy "gym_template_exercises_insert_own" on gym_workout_template_exercises
  for insert with check (
    exists (
      select 1 from gym_workout_templates t
      where t.id = template_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "gym_template_exercises_update_own" on gym_workout_template_exercises;
create policy "gym_template_exercises_update_own" on gym_workout_template_exercises
  for update using (
    exists (
      select 1 from gym_workout_templates t
      where t.id = template_id and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from gym_workout_templates t
      where t.id = template_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "gym_template_exercises_delete_own" on gym_workout_template_exercises;
create policy "gym_template_exercises_delete_own" on gym_workout_template_exercises
  for delete using (
    exists (
      select 1 from gym_workout_templates t
      where t.id = template_id and t.user_id = auth.uid()
    )
  );

-- ─── gym_workout_sessions ─────────────────────────────────────────────────────
-- Planned / in-progress / completed / skipped / cancelled sessions.
-- ActiveWorkout is represented as status = 'in_progress' (+ logger_status).

create table if not exists gym_workout_sessions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  template_id             uuid references gym_workout_templates(id) on delete set null,
  title                   text not null,
  -- Calendar day for planning (WorkoutSessionRecord.scheduledFor / date)
  planned_date            date,
  started_at              timestamptz,
  completed_at            timestamptz,
  status                  text not null check (
    status in ('planned', 'in_progress', 'completed', 'skipped', 'cancelled')
  ),
  -- ActiveWorkout logger state when status = in_progress
  logger_status           text check (
    logger_status is null or logger_status in ('active', 'paused')
  ),
  completed               boolean not null default false,
  duration_minutes        integer,
  skip_reason             text check (
    skip_reason is null
    or skip_reason in ('time', 'illness', 'busy', 'recovery', 'travel', 'other')
  ),
  skip_note               text,
  rescheduled_to          date,
  rescheduled_from_id     uuid references gym_workout_sessions(id) on delete set null,
  notes                   text,
  session_notes           text,
  pain_flags              jsonb not null default '[]'::jsonb,
  adherence_score         numeric,
  total_volume_kg         numeric,
  source                  text not null default 'gym_logger',
  rest_timer_ends_at      timestamptz,
  approved_at             timestamptz,
  based_on_snapshot_title text,
  -- Optional rollup / summary payload (not a replacement for set rows)
  summary                 jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint gym_sessions_completed_flag_consistent check (
    (status = 'completed' and completed = true)
    or (status <> 'completed' and completed = false)
  )
);

comment on table gym_workout_sessions is
  'User workout sessions including ActiveWorkout (in_progress). Exercise/set detail is normalised into child tables.';

create index if not exists idx_gym_workout_sessions_user on gym_workout_sessions(user_id);
create index if not exists idx_gym_workout_sessions_template on gym_workout_sessions(template_id);
create index if not exists idx_gym_workout_sessions_planned_date
  on gym_workout_sessions(user_id, planned_date);
create index if not exists idx_gym_workout_sessions_status
  on gym_workout_sessions(user_id, status);

-- At most one in-progress session per user (ActiveWorkout singleton).
create unique index if not exists idx_gym_workout_sessions_one_in_progress
  on gym_workout_sessions(user_id)
  where status = 'in_progress';

drop trigger if exists trg_gym_workout_sessions_updated_at on gym_workout_sessions;
create trigger trg_gym_workout_sessions_updated_at
  before update on gym_workout_sessions
  for each row execute function public.set_updated_at();

alter table gym_workout_sessions enable row level security;

drop policy if exists "gym_workout_sessions_select_own" on gym_workout_sessions;
create policy "gym_workout_sessions_select_own" on gym_workout_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "gym_workout_sessions_insert_own" on gym_workout_sessions;
create policy "gym_workout_sessions_insert_own" on gym_workout_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "gym_workout_sessions_update_own" on gym_workout_sessions;
create policy "gym_workout_sessions_update_own" on gym_workout_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gym_workout_sessions_delete_own" on gym_workout_sessions;
create policy "gym_workout_sessions_delete_own" on gym_workout_sessions
  for delete using (auth.uid() = user_id);

-- ─── gym_exercise_performances ────────────────────────────────────────────────
-- Exercises within a session (ExercisePerformanceRecord). Ownership via session.

create table if not exists gym_exercise_performances (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references gym_workout_sessions(id) on delete cascade,
  exercise_id           text not null,
  exercise_name         text not null,
  planned_exercise_id   text,
  exercise_order        integer not null,
  status                text not null default 'pending' check (
    status in ('pending', 'in_progress', 'completed', 'skipped')
  ),
  notes                 text,
  pain_flag             boolean not null default false,
  skipped               boolean not null default false,
  substituted_from_id   text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint gym_exercise_performances_order_unique unique (session_id, exercise_order)
);

comment on table gym_exercise_performances is
  'Per-session exercise rows. RLS joins gym_workout_sessions — no client-trusted user_id.';

create index if not exists idx_gym_exercise_performances_session
  on gym_exercise_performances(session_id);

create unique index if not exists idx_gym_exercise_performances_planned_id
  on gym_exercise_performances(session_id, planned_exercise_id)
  where planned_exercise_id is not null;

drop trigger if exists trg_gym_exercise_performances_updated_at on gym_exercise_performances;
create trigger trg_gym_exercise_performances_updated_at
  before update on gym_exercise_performances
  for each row execute function public.set_updated_at();

alter table gym_exercise_performances enable row level security;

drop policy if exists "gym_exercise_performances_select_own" on gym_exercise_performances;
create policy "gym_exercise_performances_select_own" on gym_exercise_performances
  for select using (
    exists (
      select 1 from gym_workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "gym_exercise_performances_insert_own" on gym_exercise_performances;
create policy "gym_exercise_performances_insert_own" on gym_exercise_performances
  for insert with check (
    exists (
      select 1 from gym_workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "gym_exercise_performances_update_own" on gym_exercise_performances;
create policy "gym_exercise_performances_update_own" on gym_exercise_performances
  for update using (
    exists (
      select 1 from gym_workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from gym_workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "gym_exercise_performances_delete_own" on gym_exercise_performances;
create policy "gym_exercise_performances_delete_own" on gym_exercise_performances
  for delete using (
    exists (
      select 1 from gym_workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- ─── gym_set_performances ─────────────────────────────────────────────────────
-- Individual sets (SetPerformanceRecord). Ownership via exercise → session.

create table if not exists gym_set_performances (
  id                        uuid primary key default gen_random_uuid(),
  exercise_performance_id   uuid not null references gym_exercise_performances(id) on delete cascade,
  set_number                integer not null,
  set_type                  text not null check (set_type in ('warmup', 'working')),
  weight                    numeric,
  reps                      integer,
  rpe                       numeric,
  rir                       numeric,
  completed                 boolean not null default false,
  completed_at              timestamptz,
  notes                     text,
  pain_flag                 boolean not null default false,
  discomfort_note           text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint gym_set_performances_number_unique unique (exercise_performance_id, set_number)
);

comment on table gym_set_performances is
  'Logged sets for an exercise performance. RLS chains through gym_exercise_performances → gym_workout_sessions.';

create index if not exists idx_gym_set_performances_exercise
  on gym_set_performances(exercise_performance_id);

drop trigger if exists trg_gym_set_performances_updated_at on gym_set_performances;
create trigger trg_gym_set_performances_updated_at
  before update on gym_set_performances
  for each row execute function public.set_updated_at();

alter table gym_set_performances enable row level security;

drop policy if exists "gym_set_performances_select_own" on gym_set_performances;
create policy "gym_set_performances_select_own" on gym_set_performances
  for select using (
    exists (
      select 1
      from gym_exercise_performances ep
      join gym_workout_sessions s on s.id = ep.session_id
      where ep.id = exercise_performance_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "gym_set_performances_insert_own" on gym_set_performances;
create policy "gym_set_performances_insert_own" on gym_set_performances
  for insert with check (
    exists (
      select 1
      from gym_exercise_performances ep
      join gym_workout_sessions s on s.id = ep.session_id
      where ep.id = exercise_performance_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "gym_set_performances_update_own" on gym_set_performances;
create policy "gym_set_performances_update_own" on gym_set_performances
  for update using (
    exists (
      select 1
      from gym_exercise_performances ep
      join gym_workout_sessions s on s.id = ep.session_id
      where ep.id = exercise_performance_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from gym_exercise_performances ep
      join gym_workout_sessions s on s.id = ep.session_id
      where ep.id = exercise_performance_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "gym_set_performances_delete_own" on gym_set_performances;
create policy "gym_set_performances_delete_own" on gym_set_performances
  for delete using (
    exists (
      select 1
      from gym_exercise_performances ep
      join gym_workout_sessions s on s.id = ep.session_id
      where ep.id = exercise_performance_id and s.user_id = auth.uid()
    )
  );

-- ─── gym_progression_records ──────────────────────────────────────────────────
-- ProgressionRecord history per user/exercise.

create table if not exists gym_progression_records (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  exercise_id           text not null,
  exercise_name         text not null,
  recorded_on           date not null,
  action                text not null check (
    action in (
      'maintain',
      'increase',
      'reduce',
      'deload_consideration',
      'insufficient_data'
    )
  ),
  recommendation        text not null,
  evidence              text not null,
  research_claim_ids    jsonb not null default '[]'::jsonb,
  last_weight           numeric,
  last_reps             integer,
  target_rep_range      text,
  created_at            timestamptz not null default now()
);

comment on table gym_progression_records is
  'Append-oriented progression recommendations. research_claim_ids is JSONB because the domain stores string[] claim IDs.';

create index if not exists idx_gym_progression_records_user
  on gym_progression_records(user_id);
create index if not exists idx_gym_progression_records_exercise
  on gym_progression_records(user_id, exercise_id, recorded_on desc);

alter table gym_progression_records enable row level security;

drop policy if exists "gym_progression_records_select_own" on gym_progression_records;
create policy "gym_progression_records_select_own" on gym_progression_records
  for select using (auth.uid() = user_id);

drop policy if exists "gym_progression_records_insert_own" on gym_progression_records;
create policy "gym_progression_records_insert_own" on gym_progression_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "gym_progression_records_update_own" on gym_progression_records;
create policy "gym_progression_records_update_own" on gym_progression_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gym_progression_records_delete_own" on gym_progression_records;
create policy "gym_progression_records_delete_own" on gym_progression_records
  for delete using (auth.uid() = user_id);

-- ─── gym_user_state ───────────────────────────────────────────────────────────
-- Ephemeral per-user gym state: approved plan + cloud migration bookkeeping.
-- ActiveWorkout lives in gym_workout_sessions (status = in_progress), not here.

create table if not exists gym_user_state (
  user_id                         uuid primary key references auth.users(id) on delete cascade,
  approved_plan                   jsonb,
  cloud_migration_completed_at    timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

comment on table gym_user_state is
  'One row per user for ApprovedWorkoutPlan JSON and migration flags. Avoids over-normalising ephemeral approval state.';

drop trigger if exists trg_gym_user_state_updated_at on gym_user_state;
create trigger trg_gym_user_state_updated_at
  before update on gym_user_state
  for each row execute function public.set_updated_at();

alter table gym_user_state enable row level security;

drop policy if exists "gym_user_state_select_own" on gym_user_state;
create policy "gym_user_state_select_own" on gym_user_state
  for select using (auth.uid() = user_id);

drop policy if exists "gym_user_state_insert_own" on gym_user_state;
create policy "gym_user_state_insert_own" on gym_user_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "gym_user_state_update_own" on gym_user_state;
create policy "gym_user_state_update_own" on gym_user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gym_user_state_delete_own" on gym_user_state;
create policy "gym_user_state_delete_own" on gym_user_state
  for delete using (auth.uid() = user_id);

-- ─── Manual RLS isolation check (run as two different authenticated users) ───
-- See docs/private-staging-deployment.md. Do not disable RLS for testing.
-- Example shape (replace UUIDs; run while authenticated as User A, then User B):
--
--   insert into gym_profiles (user_id, primary_goal, experience, training_days_per_week,
--     session_duration_minutes, preferred_split, tracking_mode)
--   values (auth.uid(), 'muscle_growth', 'intermediate', 4, 60, 'push_pull_legs', 'rpe');
--
--   select count(*) from gym_profiles;           -- expect 1 for own row only
--   select count(*) from gym_workout_sessions;   -- expect only own sessions
--   select count(*) from gym_set_performances;   -- expect only sets under own sessions
