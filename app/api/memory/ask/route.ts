import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { parseJsonBody, requireString } from '@/lib/api/validate'
import { getOpenAIApiKey, envErrorResponse } from '@/lib/env'
import { runAskMemory } from '@/lib/memory/ask'
import { runSemanticSearch } from '@/lib/memory/search'
import type { MemoryEntityType } from '@/lib/types'

export const runtime = 'nodejs'

interface AskBody {
  question: string
  project_id?: string | null
  entity_type?: MemoryEntityType | null
  limit?: number
}

export async function POST(req: Request) {
  try {
    getOpenAIApiKey()
  } catch (err) {
    return envErrorResponse(err)
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const parsed = await parseJsonBody<AskBody>(req)
  if (!parsed.ok) return parsed.response

  const questionCheck = requireString(parsed.body.question, 'question', { maxLength: 2000 })
  if (!questionCheck.ok) return questionCheck.response

  try {
    const supabase = await createClient()
    const response = await runAskMemory(supabase, {
      question: questionCheck.value,
      userId: auth.user.id,
      projectId: parsed.body.project_id ?? null,
      entityType: parsed.body.entity_type ?? null,
      limit: parsed.body.limit ?? 8,
    })
    return NextResponse.json(response)
  } catch (err) {
    console.error('[api/memory/ask]', err)
    const partial = (err as Error & { partialResponse?: unknown; searchResults?: unknown }).partialResponse
    const searchResults = (err as Error & { searchResults?: unknown }).searchResults

    if ((err as Error & { code?: string }).code === 'EMPTY_INDEX') {
      return NextResponse.json({ error: 'Memory index is empty. Rebuild memory index first.' }, { status: 400 })
    }

    if (partial && searchResults) {
      return NextResponse.json({
        ...(partial as object),
        error: err instanceof Error ? err.message : 'AI answer failed, but search results are still available.',
        searchResults,
      }, { status: 502 })
    }

    if (err instanceof Error && err.message.includes('Memory search failed')) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'AI answer failed, but search results are still available.' }, { status: 502 })
  }
}
