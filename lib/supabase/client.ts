/**
 * Browser-side Supabase client.
 *
 * Uses only the PUBLIC env vars (URL + anon key). The anon key is safe to ship
 * to the client because Row Level Security restricts what it can read/write.
 * The service role key is NEVER used anywhere in this app.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
