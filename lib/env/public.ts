/**
 * Public (client-safe) environment variables.
 *
 * Safe to import from Client Components. Only NEXT_PUBLIC_* values are exposed.
 * Never put secrets here.
 *
 * IMPORTANT (Next.js): public env vars MUST be read with static property access
 * (`process.env.NEXT_PUBLIC_…`). Dynamic access like `process.env[key]` is NOT
 * replaced at build time and appears undefined in the browser even when
 * `.env.local` is correctly set at the Next.js project root.
 */

export type AppEnvName = 'local' | 'staging' | 'production'

export interface PublicEnv {
  supabaseUrl: string
  supabaseAnonKey: string
  /** Canonical app origin for this environment (no trailing slash). Empty when unset. */
  appUrl: string
  appEnv: AppEnvName
}

const DEV_HINT =
  'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local at the Next.js project root (alongside package.json), then restart the dev server.'

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function parseAppEnv(raw: string | undefined): AppEnvName {
  if (raw === 'staging' || raw === 'production' || raw === 'local') return raw
  return 'local'
}

function safeHostname(url: string | undefined): string {
  if (!url) return '(missing)'
  try {
    return new URL(url).hostname
  } catch {
    return '(invalid-url)'
  }
}

let didLogPublicEnvDiagnostics = false

/**
 * Development-only: reports presence of public vars and Supabase/app URL hostnames.
 * Never logs anon keys or other secret values.
 */
export function logPublicEnvDiagnostics(): void {
  if (process.env.NODE_ENV !== 'development') return
  if (didLogPublicEnvDiagnostics) return
  didLogPublicEnvDiagnostics = true

  const supabaseUrl = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const appUrl = trimEnv(process.env.NEXT_PUBLIC_APP_URL)
  const appEnv = trimEnv(process.env.NEXT_PUBLIC_APP_ENV)

  // eslint-disable-next-line no-console -- intentional local diagnostics
  console.info('[FounderOS env] public variables', {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `present (${safeHostname(supabaseUrl)})` : 'missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'present' : 'missing',
    NEXT_PUBLIC_APP_URL: appUrl ? `present (${safeHostname(appUrl)})` : 'missing',
    NEXT_PUBLIC_APP_ENV: appEnv ? `present (${appEnv})` : 'missing (defaults to local)',
  })
}

/**
 * Required public Supabase configuration plus optional app URL / environment label.
 * Throws one clear error if required Supabase vars are missing.
 */
export function getPublicEnv(): PublicEnv {
  // Static property access only — required for Next.js client inlining.
  const supabaseUrl = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const appUrlRaw = trimEnv(process.env.NEXT_PUBLIC_APP_URL)
  const appEnvRaw = trimEnv(process.env.NEXT_PUBLIC_APP_ENV)

  logPublicEnvDiagnostics()

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing: string[] = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    throw new Error(
      `Missing required public environment variable(s): ${missing.join(', ')}. ${DEV_HINT}`,
    )
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    appUrl: (appUrlRaw ?? '').replace(/\/$/, ''),
    appEnv: parseAppEnv(appEnvRaw),
  }
}

/** True when NEXT_PUBLIC_APP_ENV is staging. Safe for client UI badges. */
export function isStagingEnvironment(): boolean {
  return parseAppEnv(trimEnv(process.env.NEXT_PUBLIC_APP_ENV)) === 'staging'
}
