import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { getMemoryIndexStatus } from '@/lib/db/embeddings'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const supabase = await createClient()
    const status = await getMemoryIndexStatus(supabase, auth.user.id)
    return NextResponse.json(status)
  } catch (err) {
    console.error('[api/memory/status]', err)
    return NextResponse.json({ error: 'Could not load memory index status.' }, { status: 500 })
  }
}
