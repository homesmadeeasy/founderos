/**
 * Authenticated app route prefixes — shared by proxy session guard and tests.
 * Keep in sync with routes under app/(app)/.
 */

export const PROTECTED_PREFIXES = [
  '/home',
  '/founder',
  '/dashboard',
  '/domains',
  '/inbox',
  '/signals',
  '/morning',
  '/evening',
  '/objects',
  '/memory',
  '/knowledge',
  '/executive',
  '/projects',
  '/goals',
  '/ideas',
  '/review',
  '/weekly-review',
  '/patterns',
  '/settings',
  '/onboarding',
  '/memory-search',
  '/gym',
  '/evaluation',
] as const

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}
