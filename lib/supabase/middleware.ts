/**
 * Session refresh + route protection used by the root proxy.
 *
 * - Refreshes the Supabase auth cookie on every request (keeps sessions alive).
 * - Redirects unauthenticated users away from protected app routes to /login.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getPublicEnv } from '@/lib/env/public'
import { isProtectedPath } from '@/lib/supabase/protectedRoutes'

export { PROTECTED_PREFIXES, isProtectedPath } from '@/lib/supabase/protectedRoutes'

// Auth routes a logged-in user shouldn't see.
const AUTH_ROUTES = ['/login', '/signup']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv()

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: getUser() must be called to refresh the session cookie.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = isProtectedPath(pathname)
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  // Not logged in + visiting a protected route → send to /login
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Logged in + visiting login/signup → send to /home
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Onboarding gate for new users
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      if (!profile.onboarding_completed && pathname !== '/onboarding') {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        url.search = ''
        return NextResponse.redirect(url)
      }
      if (profile.onboarding_completed && pathname === '/onboarding') {
        const url = request.nextUrl.clone()
        url.pathname = '/home'
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}
