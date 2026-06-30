import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { parseJsonBody, requireString } from '@/lib/api/validate'
import { getOpenAIApiKey, envErrorResponse } from '@/lib/env'
import { runSemanticSearch } from '@/lib/memory/search'
import type { MemoryEntityType } from '@/lib/types'

export const runtime = 'nodejs'

interface SearchBody {
  query: string
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

  const parsed = await parseJsonBody<SearchBody>(req)
  if (!parsed.ok) return parsed.response

  const queryCheck = requireString(parsed.body.query, 'query', { maxLength: 2000 })
  if (!queryCheck.ok) return queryCheck.response

  try {
    const supabase = await createClient()
    const response = await runSemanticSearch(supabase, {
      query: queryCheck.value,
      userId: auth.user.id,
      projectId: parsed.body.project_id ?? null,
      entityType: parsed.body.entity_type ?? null,
      limit: Math.min(parsed.body.limit ?? 10, 25),
    })

    if (!response.results.length && response.count === 0) {
      const indexed = await supabase.from('memory_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auth.user.id)
      if ((indexed.count ?? 0) === 0) {
        return NextResponse.json({
          ...response,
          error: 'Memory index is empty. Rebuild memory index first.',
        })
      }
      return NextResponse.json({
        ...response,
        message: 'No relevant memories found.',
      })
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[api/memory/search]', err)
    if ((err as Error & { code?: string }).code === 'EMPTY_INDEX') {
      return NextResponse.json({ error: 'Memory index is empty. Rebuild memory index first.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Memory search failed. Try again.' }, { status: 500 })
  }
}
