import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { getOpenAIApiKey, envErrorResponse } from '@/lib/env'
import { reindexAllUserMemory } from '@/lib/memory/indexing'
import { getMemoryIndexStatus } from '@/lib/db/embeddings'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST() {
  try {
    getOpenAIApiKey()
  } catch (err) {
    return envErrorResponse(err)
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const supabase = await createClient()
    const indexed = await reindexAllUserMemory(supabase, auth.user.id)
    const status = await getMemoryIndexStatus(supabase, auth.user.id)
    return NextResponse.json({ indexed, ...status })
  } catch (err) {
    console.error('[api/memory/reindex]', err)
    const message = err instanceof Error ? err.message : 'Memory reindex failed. Try again.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
