/**
 * Server-side Supabase client (Server Components, Route Handlers, Server Actions).
 *
 * Reads/writes the auth session from cookies. Uses the anon key + RLS — no
 * service role key. In Next.js 16 cookies() is async.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPublicEnv } from '@/lib/env/public'

export async function createClient() {
  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — safe to ignore; the middleware
            // refreshes the session cookie on each request.
          }
        },
      },
    },
  )
}
