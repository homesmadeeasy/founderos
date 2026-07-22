/**
 * Browser-side Supabase client.
 *
 * Uses only the PUBLIC env vars (URL + anon key). The anon key is safe to ship
 * to the client because Row Level Security restricts what it can read/write.
 * The service role key is NEVER used anywhere in this app.
 */

import { createBrowserClient } from '@supabase/ssr'
import { getPublicEnv } from '@/lib/env/public'

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv()
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
