/**
 * POST /api/command
 *
 * Placeholder for future AI-powered command routing.
 * Not used by the Global Command Bar yet — rule-based parsing handles commands client-side.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { query?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const query = body.query?.trim()
  if (!query) {
    return NextResponse.json({ error: 'query is required.' }, { status: 400 })
  }

  // Future: route natural-language commands with OpenAI.
  return NextResponse.json({
    message: 'AI command routing is not enabled yet. Use the in-app command bar with rule-based commands.',
    query,
    actions: [],
  })
}
