/**
 * Server-side environment validation.
 * Never import this from client components — use only in API routes and server code.
 */

export interface ServerEnv {
  openaiApiKey: string
  supabaseUrl: string
  supabaseAnonKey: string
}

const DEV_HINT = 'Check .env.local in the project root and restart the dev server.'

function read(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

/** Validate required server env vars. Throws with a clear developer message if missing. */
export function getServerEnv(): ServerEnv {
  const openaiApiKey = read('OPENAI_API_KEY')
  const supabaseUrl = read('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = read('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const missing: string[] = []
  if (!openaiApiKey) missing.push('OPENAI_API_KEY')
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ${DEV_HINT}`,
    )
  }

  return {
    openaiApiKey: openaiApiKey!,
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
  }
}

/** OpenAI-only routes can call this instead of full getServerEnv(). */
export function getOpenAIApiKey(): string {
  const key = read('OPENAI_API_KEY')
  if (!key) {
    throw new Error(`Missing OPENAI_API_KEY. ${DEV_HINT}`)
  }
  return key
}

/** Map env validation errors to JSON API responses. */
export function envErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : 'Server configuration error.'
  return Response.json({ error: message }, { status: 500 })
}
