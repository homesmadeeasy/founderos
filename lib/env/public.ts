/**
 * Public (client-safe) environment variables.
 *
 * Safe to import from Client Components. Only NEXT_PUBLIC_* values are exposed.
 * Never put secrets here.
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
  'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (local) or your host env (staging/production), then restart.'

function read(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

function parseAppEnv(raw: string | undefined): AppEnvName {
  if (raw === 'staging' || raw === 'production' || raw === 'local') return raw
  return 'local'
}

/**
 * Required public Supabase configuration plus optional app URL / environment label.
 * Throws one clear error if required Supabase vars are missing.
 */
export function getPublicEnv(): PublicEnv {
  const supabaseUrl = read('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = read('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const missing: string[] = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (missing.length > 0) {
    throw new Error(
      `Missing required public environment variable(s): ${missing.join(', ')}. ${DEV_HINT}`,
    )
  }

  const appUrl = (read('NEXT_PUBLIC_APP_URL') ?? '').replace(/\/$/, '')

  return {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
    appUrl,
    appEnv: parseAppEnv(read('NEXT_PUBLIC_APP_ENV')),
  }
}

/** True when NEXT_PUBLIC_APP_ENV is staging. Safe for client UI badges. */
export function isStagingEnvironment(): boolean {
  return parseAppEnv(read('NEXT_PUBLIC_APP_ENV')) === 'staging'
}
