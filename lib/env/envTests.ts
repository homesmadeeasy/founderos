/**
 * Phase 1 environment and route-protection checks.
 * Does not call production services.
 */

import assert from 'node:assert/strict'
import { getPublicEnv, isStagingEnvironment } from './public'
import {
  getServerEnv,
  getOptionalOpenAIApiKey,
  getOpenAIApiKey,
  isGoogleOAuthConfigured,
  validateEnvAtStartup,
} from '../env'
import { isProtectedPath, PROTECTED_PREFIXES } from '../supabase/protectedRoutes'

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>()
  for (const key of Object.keys(vars)) {
    previous.set(key, process.env[key])
    const next = vars[key]
    if (next === undefined) delete process.env[key]
    else process.env[key] = next
  }
  try {
    fn()
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

console.log('Env and route protection tests\n')

// Guardrail: public.ts must keep static process.env.NEXT_PUBLIC_* access for
// Next.js client inlining. Dynamic process.env[name] breaks the browser bundle.
withEnv(
  {
    NEXT_PUBLIC_SUPABASE_URL: 'https://static-access.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'static-anon',
  },
  () => {
    assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'https://static-access.supabase.co')
    assert.equal(getPublicEnv().supabaseUrl, 'https://static-access.supabase.co')
    console.log('PASS: getPublicEnv reads statically accessed NEXT_PUBLIC vars')
  },
)

withEnv(
  {
    NEXT_PUBLIC_SUPABASE_URL: undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
  },
  () => {
    assert.throws(
      () => getPublicEnv(),
      /Missing required public environment variable\(s\): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    )
    assert.throws(() => validateEnvAtStartup(), /Missing required public environment variable/)
    console.log('PASS: missing Supabase public vars produce one clear error')
  },
)

withEnv(
  {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    NEXT_PUBLIC_APP_URL: 'https://staging.example.com/',
    NEXT_PUBLIC_APP_ENV: 'staging',
    OPENAI_API_KEY: undefined,
    OPENAI_FOUNDER_MODEL: undefined,
    GOOGLE_CLIENT_ID: undefined,
    GOOGLE_CLIENT_SECRET: undefined,
    GOOGLE_REDIRECT_URI: undefined,
  },
  () => {
    const publicEnv = getPublicEnv()
    assert.equal(publicEnv.supabaseUrl, 'https://example.supabase.co')
    assert.equal(publicEnv.appUrl, 'https://staging.example.com')
    assert.equal(publicEnv.appEnv, 'staging')
    assert.equal(isStagingEnvironment(), true)

    const server = getServerEnv()
    assert.equal(server.openaiApiKey, undefined)
    assert.equal(getOptionalOpenAIApiKey(), null)
    assert.equal(isGoogleOAuthConfigured(), false)
    assert.doesNotThrow(() => validateEnvAtStartup())
    assert.throws(() => getOpenAIApiKey(), /Missing OPENAI_API_KEY/)
    console.log('PASS: optional AI/Google vars do not crash; OpenAI remains optional')
  },
)

withEnv(
  {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    NEXT_PUBLIC_APP_ENV: 'local',
    OPENAI_API_KEY: 'sk-test',
  },
  () => {
    assert.equal(isStagingEnvironment(), false)
    assert.equal(getOptionalOpenAIApiKey(), 'sk-test')
    assert.equal(getServerEnv().openaiApiKey, 'sk-test')
    console.log('PASS: local env + optional OpenAI key resolve correctly')
  },
)

assert.ok(PROTECTED_PREFIXES.includes('/gym'))
assert.ok(PROTECTED_PREFIXES.includes('/evaluation'))
assert.equal(isProtectedPath('/gym'), true)
assert.equal(isProtectedPath('/gym/workout'), true)
assert.equal(isProtectedPath('/gym/history/abc'), true)
assert.equal(isProtectedPath('/evaluation'), true)
assert.equal(isProtectedPath('/login'), false)
assert.equal(isProtectedPath('/'), false)
console.log('PASS: /gym and /evaluation are protected; public routes are not')

console.log('\nAll env tests passed.')
