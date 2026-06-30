import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { completeOnboarding } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  }

  try {
    const profile = await completeOnboarding(supabase, user.id)
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[api/onboarding/complete] failed:', err)
    return NextResponse.json({ error: 'Could not save onboarding progress.' }, { status: 500 })
  }
}
