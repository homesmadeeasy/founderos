import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { parseJsonBody, requireId } from '@/lib/api/validate'
import { getOpenAIApiKey, envErrorResponse } from '@/lib/env'
import { indexEntityById } from '@/lib/memory/indexing'
import type { MemoryEntityType } from '@/lib/types'
import { MEMORY_ENTITY_TYPES } from '@/lib/memory/routes'

export const runtime = 'nodejs'

interface IndexItemBody {
  entity_type: MemoryEntityType
  entity_id: string
}

export async function POST(req: Request) {
  try {
    getOpenAIApiKey()
  } catch (err) {
    return envErrorResponse(err)
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const parsed = await parseJsonBody<IndexItemBody>(req)
  if (!parsed.ok) return parsed.response

  const entityIdCheck = requireId(parsed.body.entity_id, 'entity_id')
  if (!entityIdCheck.ok) return entityIdCheck.response

  const entityType = parsed.body.entity_type
  if (!entityType || !MEMORY_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'Invalid entity_type.' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const indexed = await indexEntityById(supabase, auth.user.id, entityType, entityIdCheck.value)
    return NextResponse.json({ indexed })
  } catch (err) {
    console.error('[api/memory/index-item]', err)
    return NextResponse.json({ error: 'Memory indexing failed.' }, { status: 500 })
  }
}
