-- ============================================================================
-- FounderOS — Semantic Search / Vector Memory migration
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Requires: core schema + feature tables already applied.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" guards.
-- ============================================================================

-- Enable pgvector for embedding storage and similarity search
create extension if not exists vector;

-- ─── memory_embeddings ────────────────────────────────────────────────────────

create table if not exists memory_embeddings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  entity_type     text not null,
  entity_id       uuid not null,
  project_id      uuid references projects(id) on delete cascade,
  title           text,
  content         text not null,
  content_preview text,
  metadata        jsonb default '{}'::jsonb,
  embedding       vector(1536),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_memory_embeddings_user
  on memory_embeddings(user_id);

create index if not exists idx_memory_embeddings_project
  on memory_embeddings(project_id);

create unique index if not exists idx_memory_embeddings_entity
  on memory_embeddings(user_id, entity_type, entity_id);

-- HNSW index for fast cosine similarity search
create index if not exists idx_memory_embeddings_embedding
  on memory_embeddings using hnsw (embedding vector_cosine_ops);

alter table memory_embeddings enable row level security;

drop policy if exists "memory_embeddings_select_own" on memory_embeddings;
create policy "memory_embeddings_select_own" on memory_embeddings
  for select using (auth.uid() = user_id);

drop policy if exists "memory_embeddings_insert_own" on memory_embeddings;
create policy "memory_embeddings_insert_own" on memory_embeddings
  for insert with check (auth.uid() = user_id);

drop policy if exists "memory_embeddings_update_own" on memory_embeddings;
create policy "memory_embeddings_update_own" on memory_embeddings
  for update using (auth.uid() = user_id);

drop policy if exists "memory_embeddings_delete_own" on memory_embeddings;
create policy "memory_embeddings_delete_own" on memory_embeddings
  for delete using (auth.uid() = user_id);

-- ─── Similarity search function ─────────────────────────────────────────────

create or replace function match_memory_embeddings(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int default 10,
  similarity_threshold float default 0.3,
  filter_project_id uuid default null,
  filter_entity_type text default null
)
returns table (
  id uuid,
  entity_type text,
  entity_id uuid,
  project_id uuid,
  title text,
  content_preview text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    me.id,
    me.entity_type,
    me.entity_id,
    me.project_id,
    me.title,
    me.content_preview,
    me.metadata,
    1 - (me.embedding <=> query_embedding) as similarity
  from memory_embeddings me
  where me.user_id = match_user_id
    and me.embedding is not null
    and (filter_project_id is null or me.project_id = filter_project_id)
    and (filter_entity_type is null or me.entity_type = filter_entity_type)
    and 1 - (me.embedding <=> query_embedding) >= similarity_threshold
  order by me.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function match_memory_embeddings(
  vector, uuid, int, float, uuid, text
) to authenticated;
