/**
 * Shared API route auth helpers.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse }

/** Require a signed-in Supabase user for API routes. */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'You must be signed in to use this feature.' },
        { status: 401 },
      ),
    }
  }
  return { ok: true, user }
}
