/**
 * Server-only Ask Memory helpers.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AskMemoryResponse, MemoryEntityType } from '@/lib/types'
import { runJsonCompletion, mapOpenAIError } from '@/lib/ai/server'
import { runSemanticSearch } from '@/lib/memory/search'
import { MEMORY_ENTITY_LABEL } from '@/lib/memory/routes'
import { memoryEntityHref } from '@/lib/memory/routes'

export const ASK_MEMORY_SYSTEM_PROMPT = `You are the Memory Answer Engine inside FounderOS.

FounderOS is a personal AI operating system for young builders, founders, coders and ambitious students.

Your job is to answer the user's question using their FounderOS memory.

Use only the retrieved memory context.
Do not invent facts.
If the memory context is insufficient, say what is missing.
Be practical, concise and specific.
When useful, mention which memories support the answer.

Return only valid JSON in this exact shape:
{
  "answer": "your answer",
  "sources_used": ["short label for memory 1", "short label for memory 2"],
  "follow_up_actions": ["optional action 1", "optional action 2"]
}`

export interface AskMemoryOptions {
  question: string
  userId: string
  projectId?: string | null
  entityType?: MemoryEntityType | null
  limit?: number
}

function renderMemoryContext(
  results: Awaited<ReturnType<typeof runSemanticSearch>>['results'],
): string {
  if (!results.length) return '(No relevant memories found.)'
  return results.map((r, i) => {
    const label = MEMORY_ENTITY_LABEL[r.entityType]
    return `[${i + 1}] ${label}: ${r.title ?? r.entityType}
Preview: ${r.contentPreview ?? '(no preview)'}
Similarity: ${(r.similarity * 100).toFixed(0)}%`
  }).join('\n\n')
}

function normalizeAskResponse(
  parsed: unknown,
  searchResults: Awaited<ReturnType<typeof runSemanticSearch>>['results'],
): AskMemoryResponse {
  const obj = parsed as Record<string, unknown>
  const answer = typeof obj.answer === 'string' ? obj.answer.trim() : ''
  const followUpActions = Array.isArray(obj.follow_up_actions)
    ? obj.follow_up_actions.filter((a): a is string => typeof a === 'string').slice(0, 5)
    : []

  const sources = searchResults.slice(0, 8).map(r => ({
    entityType: r.entityType,
    entityId: r.entityId,
    title: r.title,
    contentPreview: r.contentPreview,
    projectId: r.projectId,
    href: r.href,
  }))

  return {
    answer: answer || 'I could not generate an answer from your memory.',
    sources,
    followUpActions,
  }
}

export async function runAskMemory(
  supabase: SupabaseClient,
  options: AskMemoryOptions,
): Promise<AskMemoryResponse> {
  const question = options.question.trim()
  if (!question) {
    return { answer: 'Please ask a question.', sources: [], followUpActions: [] }
  }

  let searchResponse
  try {
    searchResponse = await runSemanticSearch(supabase, {
      query: question,
      userId: options.userId,
      projectId: options.projectId,
      entityType: options.entityType,
      limit: options.limit ?? 8,
      similarityThreshold: 0.25,
    })
  } catch (err) {
    if ((err as Error & { code?: string }).code === 'EMPTY_INDEX') throw err
    throw new Error('Memory search failed. Try again.')
  }

  if (!searchResponse.results.length) {
    return {
      answer: 'No relevant memories found for that question. Try rebuilding your memory index or rephrasing.',
      sources: [],
      followUpActions: ['Rebuild memory index', 'Add more notes or decisions to your projects'],
    }
  }

  try {
    const parsed = await runJsonCompletion(
      {
        system: ASK_MEMORY_SYSTEM_PROMPT,
        user: `User question:\n${question}\n\nRetrieved memory context:\n${renderMemoryContext(searchResponse.results)}`,
        temperature: 0.3,
        maxTokens: 900,
      },
      p => p,
    )
    return normalizeAskResponse(parsed, searchResponse.results)
  } catch (err) {
    console.error('[memory/ask] AI answer failed:', err)
    const { message } = mapOpenAIError(err)
    const fallbackSources = searchResponse.results.slice(0, 5).map(r => ({
      entityType: r.entityType,
      entityId: r.entityId,
      title: r.title,
      contentPreview: r.contentPreview,
      projectId: r.projectId,
      href: memoryEntityHref(r.entityType, r.entityId, r.projectId, r.metadata),
    }))
    throw Object.assign(new Error(`AI answer failed, but search results are still available. (${message})`), {
      searchResults: searchResponse.results,
      partialResponse: {
        answer: '',
        sources: fallbackSources,
        followUpActions: [] as string[],
      },
    })
  }
}
