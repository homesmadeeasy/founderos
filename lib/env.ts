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

const DEV_HINT = 'Check .env.local in the Next.js project root (alongside package.json) and restart the dev server.'

function trimServerEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

/**
 * Server environment snapshot.
 * Requires public Supabase vars. OPENAI_* and Google vars are optional.
 *
 * Server-only secrets use static property access for clarity. This module must
 * never be imported from Client Components.
 */
export function getServerEnv(): ServerEnv {
  const publicEnv = getPublicEnv()

  return {
    public: publicEnv,
    openaiApiKey: trimServerEnv(process.env.OPENAI_API_KEY),
    openaiFounderModel: trimServerEnv(process.env.OPENAI_FOUNDER_MODEL),
    google: getGoogleIntegrationEnv(),
  }
}

/** Google Calendar OAuth — all optional; integration stays disabled until complete. */
export function getGoogleIntegrationEnv(): GoogleIntegrationEnv {
  return {
    clientId: trimServerEnv(process.env.GOOGLE_CLIENT_ID),
    clientSecret: trimServerEnv(process.env.GOOGLE_CLIENT_SECRET),
    redirectUri: trimServerEnv(process.env.GOOGLE_REDIRECT_URI),
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
  const key = trimServerEnv(process.env.OPENAI_API_KEY)
  if (!key) {
    throw new Error(`Missing OPENAI_API_KEY. ${DEV_HINT}`)
  }
  return key
}

/** Optional OpenAI key — null when unset (Founder AI deterministic mode). */
export function getOptionalOpenAIApiKey(): string | null {
  return trimServerEnv(process.env.OPENAI_API_KEY) ?? null
}

export function getOptionalOpenAIFounderModel(): string | undefined {
  return trimServerEnv(process.env.OPENAI_FOUNDER_MODEL)
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
