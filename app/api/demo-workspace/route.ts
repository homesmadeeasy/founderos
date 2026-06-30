import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDemoWorkspace } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  }

  try {
    const result = await createDemoWorkspace(supabase, user.id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create demo workspace.'
    console.error('[api/demo-workspace] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
