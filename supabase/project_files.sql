-- ============================================================================
-- FounderOS — Project Files + Storage migration
-- Adds project_files table, project-files storage bucket, and extends links
-- entity types to include project_file.
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- ============================================================================

-- ─── project_files table ──────────────────────────────────────────────────────

create table if not exists project_files (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  file_name       text not null,
  file_path       text not null,
  file_type       text,
  file_size       integer,
  summary         text,
  extracted_text  text,
  status          text not null default 'Uploaded' check (status in (
    'Uploaded', 'Processing', 'Summarised', 'Failed'
  )),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_project_files_user    on project_files(user_id);
create index if not exists idx_project_files_project on project_files(project_id);

alter table project_files enable row level security;

drop policy if exists "project_files_select_own" on project_files;
drop policy if exists "project_files_insert_own" on project_files;
drop policy if exists "project_files_update_own" on project_files;
drop policy if exists "project_files_delete_own" on project_files;

create policy "project_files_select_own" on project_files for select using (auth.uid() = user_id);
create policy "project_files_insert_own" on project_files for insert with check (auth.uid() = user_id);
create policy "project_files_update_own" on project_files for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "project_files_delete_own" on project_files for delete using (auth.uid() = user_id);

-- ─── Extend links entity types for project_file ─────────────────────────────

alter table links drop constraint if exists links_source_type_check;
alter table links drop constraint if exists links_target_type_check;

alter table links add constraint links_source_type_check check (source_type in (
  'idea','idea_analysis','project','conversation','message',
  'task','note','decision','risk','roadmap_item','project_review','project_file'
));

alter table links add constraint links_target_type_check check (target_type in (
  'idea','idea_analysis','project','conversation','message',
  'task','note','decision','risk','roadmap_item','project_review','project_file'
));

-- ─── Storage bucket: project-files ────────────────────────────────────────────
-- Path pattern: {user_id}/{project_id}/{filename}

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "project_files_storage_insert" on storage.objects;
drop policy if exists "project_files_storage_select" on storage.objects;
drop policy if exists "project_files_storage_delete" on storage.objects;

create policy "project_files_storage_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "project_files_storage_select" on storage.objects for select to authenticated
using (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "project_files_storage_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
