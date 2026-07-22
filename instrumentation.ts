/**
 * Next.js server startup hook — validates required public environment once.
 * Optional OPENAI_* and Google variables are not required here.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvAtStartup } = await import('./lib/env')
    validateEnvAtStartup()
  }
}
