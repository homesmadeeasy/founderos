/**
 * Supabase data access: memory embeddings (vector search)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemoryEntityType, MemoryIndexStatus, MemorySearchResult } from '@/lib/types'
import { memoryEntityHref } from '@/lib/memory/routes'

export interface MemoryEmbeddingInsert {
  userId: string
  entityType: MemoryEntityType
  entityId: string
  projectId: string | null
  title: string | null
  content: string
  contentPreview: string | null
  metadata: Record<string, unknown>
  embedding: number[]
}

interface MatchMemoryRow {
  id: string
  entity_type: MemoryEntityType
  entity_id: string
  project_id: string | null
  title: string | null
  content_preview: string | null
  metadata: Record<string, unknown> | null
  similarity: number
}

export async function upsertMemoryEmbeddingRow(
  supabase: SupabaseClient,
  row: MemoryEmbeddingInsert,
): Promise<void> {
  const { error } = await supabase.from('memory_embeddings').upsert({
    user_id: row.userId,
    entity_type: row.entityType,
    entity_id: row.entityId,
    project_id: row.projectId,
    title: row.title,
    content: row.content,
    content_preview: row.contentPreview,
    metadata: row.metadata,
    embedding: row.embedding,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,entity_type,entity_id' })
  if (error) throw error
}

export async function deleteMemoryEmbeddingRow(
  supabase: SupabaseClient,
  userId: string,
  entityType: MemoryEntityType,
  entityId: string,
): Promise<void> {
  const { error } = await supabase.from('memory_embeddings')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
  if (error) throw error
}

export async function deleteAllMemoryEmbeddings(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.from('memory_embeddings').delete().eq('user_id', userId)
  if (error) throw error
}

export interface MemorySearchOptions {
  queryEmbedding: number[]
  userId: string
  limit?: number
  similarityThreshold?: number
  projectId?: string | null
  entityType?: MemoryEntityType | null
}

export async function searchMemoryEmbeddings(
  supabase: SupabaseClient,
  options: MemorySearchOptions,
): Promise<MemorySearchResult[]> {
  const { data, error } = await supabase.rpc('match_memory_embeddings', {
    query_embedding: options.queryEmbedding,
    match_user_id: options.userId,
    match_count: options.limit ?? 10,
    similarity_threshold: options.similarityThreshold ?? 0.3,
    filter_project_id: options.projectId ?? null,
    filter_entity_type: options.entityType ?? null,
  })
  if (error) throw error

  return ((data ?? []) as MatchMemoryRow[]).map(row => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    projectId: row.project_id,
    title: row.title,
    contentPreview: row.content_preview,
    metadata: row.metadata ?? {},
    similarity: row.similarity,
    href: memoryEntityHref(row.entity_type, row.entity_id, row.project_id, row.metadata ?? {}),
  }))
}

export async function getMemoryIndexStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<MemoryIndexStatus> {
  const { count, error: countError } = await supabase
    .from('memory_embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (countError) throw countError

  const { data, error: latestError } = await supabase
    .from('memory_embeddings')
    .select('updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestError) throw latestError

  return {
    indexedCount: count ?? 0,
    lastIndexedAt: data?.updated_at ?? null,
  }
}

export async function countMemoryEmbeddings(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('memory_embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}
