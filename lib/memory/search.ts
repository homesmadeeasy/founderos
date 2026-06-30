/**
 * Server-only semantic memory search helpers.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemoryEntityType, MemorySearchResult, SemanticSearchResponse } from '@/lib/types'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { searchMemoryEmbeddings, countMemoryEmbeddings } from '@/lib/db/embeddings'

export interface SemanticSearchOptions {
  query: string
  userId: string
  projectId?: string | null
  entityType?: MemoryEntityType | null
  limit?: number
  similarityThreshold?: number
}

export async function runSemanticSearch(
  supabase: SupabaseClient,
  options: SemanticSearchOptions,
): Promise<SemanticSearchResponse> {
  const query = options.query.trim()
  if (!query) {
    return { results: [], query, count: 0 }
  }

  const indexedCount = await countMemoryEmbeddings(supabase, options.userId)
  if (indexedCount === 0) {
    const err = new Error('Memory index is empty. Rebuild memory index first.')
    ;(err as Error & { code: string }).code = 'EMPTY_INDEX'
    throw err
  }

  const queryEmbedding = await generateEmbedding(query)
  const results = await searchMemoryEmbeddings(supabase, {
    queryEmbedding,
    userId: options.userId,
    limit: options.limit ?? 10,
    similarityThreshold: options.similarityThreshold ?? 0.3,
    projectId: options.projectId,
    entityType: options.entityType,
  })

  return { results, query, count: results.length }
}

/** Format search results as concise strings for AI context. */
export function formatMemoryResultsForContext(results: MemorySearchResult[], max = 3): string[] {
  return results.slice(0, max).map(r => {
    const label = r.title ?? r.entityType
    const preview = r.contentPreview ?? ''
    return `[${r.entityType}] ${label}: ${preview}`
  })
}
