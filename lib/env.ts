/**
 * Typed environment boundary for FounderOS.
 *
 * - getPublicEnv() / isStagingEnvironment() — safe for Client Components
 *   (re-exported from ./env/public; only NEXT_PUBLIC_* values).
 * - getServerEnv() / getOpenAIApiKey() / Google helpers — server-only.
 *
 * Never import getServerEnv, getOpenAIApiKey, or Google helpers from client components.
 */

import { getPublicEnv, isStagingEnvironment, type PublicEnv, type AppEnvName } from './env/public'

export type { PublicEnv, AppEnvName }
export { getPublicEnv, isStagingEnvironment }

export interface GoogleIntegrationEnv {
  clientId?: string
  clientSecret?: string
  redirectUri?: string
}

export interface ServerEnv {
  /** Public Supabase + app identity (same as getPublicEnv). */
  public: PublicEnv
  /** Optional — Founder AI and other routes degrade when absent. */
  openaiApiKey?: string
  /** Optional — defaults applied by Founder AI config when absent. */
  openaiFounderModel?: string
  google: GoogleIntegrationEnv
}

const DEV_HINT = 'Check .env.local in the project root and restart the dev server.'

function read(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

/**
 * Server environment snapshot.
 * Requires public Supabase vars. OPENAI_* and Google vars are optional.
 */
export function getServerEnv(): ServerEnv {
  const publicEnv = getPublicEnv()

  return {
    public: publicEnv,
    openaiApiKey: read('OPENAI_API_KEY'),
    openaiFounderModel: read('OPENAI_FOUNDER_MODEL'),
    google: getGoogleIntegrationEnv(),
  }
}

/** Google Calendar OAuth — all optional; integration stays disabled until complete. */
export function getGoogleIntegrationEnv(): GoogleIntegrationEnv {
  return {
    clientId: read('GOOGLE_CLIENT_ID'),
    clientSecret: read('GOOGLE_CLIENT_SECRET'),
    redirectUri: read('GOOGLE_REDIRECT_URI'),
  }
}

export function isGoogleOAuthConfigured(): boolean {
  const cfg = getGoogleIntegrationEnv()
  return Boolean(cfg.clientId && cfg.clientSecret && cfg.redirectUri)
}

/**
 * OpenAI key for routes that require a live model.
 * Prefer optional reads + deterministic fallback for Founder AI.
 */
export function getOpenAIApiKey(): string {
  const key = read('OPENAI_API_KEY')
  if (!key) {
    throw new Error(`Missing OPENAI_API_KEY. ${DEV_HINT}`)
  }
  return key
}

/** Optional OpenAI key — null when unset (Founder AI deterministic mode). */
export function getOptionalOpenAIApiKey(): string | null {
  return read('OPENAI_API_KEY') ?? null
}

export function getOptionalOpenAIFounderModel(): string | undefined {
  return read('OPENAI_FOUNDER_MODEL')
}

/**
 * Validate required public env once at server startup.
 * Optional AI / Google vars must not throw here.
 */
export function validateEnvAtStartup(): void {
  getPublicEnv()
}

/** Map env validation errors to JSON API responses. */
export function envErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : 'Server configuration error.'
  return Response.json({ error: message }, { status: 500 })
}
