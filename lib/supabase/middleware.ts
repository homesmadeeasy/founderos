/**
 * Session refresh + route protection used by the root middleware.
 *
 * - Refreshes the Supabase auth cookie on every request (keeps sessions alive).
 * - Redirects unauthenticated users away from protected app routes to /login.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require a logged-in user.
const PROTECTED_PREFIXES = ['/dashboard', '/inbox', '/morning', '/evening', '/objects', '/memory', '/knowledge', '/executive', '/projects', '/goals', '/ideas', '/review', '/weekly-review', '/patterns', '/settings', '/onboarding', '/memory-search']

// Auth routes a logged-in user shouldn't see.
const AUTH_ROUTES = ['/login', '/signup']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  // Not logged in + visiting a protected route → send to /login
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Logged in + visiting login/signup → send to /dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
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
        url.pathname = '/dashboard'
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}
