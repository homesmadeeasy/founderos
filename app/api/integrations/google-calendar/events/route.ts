import { NextResponse } from 'next/server'
import { fetchGoogleCalendarEvents } from '@/lib/integrations/google-calendar/fetchEvents'
import { isGoogleOAuthConfigured } from '@/lib/integrations/google-calendar/config'

export const runtime = 'nodejs'

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token || null
}

export async function GET(request: Request) {
  const token = extractBearerToken(request)

  if (!token) {
    return NextResponse.json({
      ok: false,
      error: 'Google Calendar is not connected yet.',
      connected: false,
      mode: 'none',
      oauthPrepared: isGoogleOAuthConfigured(),
    })
  }

  const result = await fetchGoogleCalendarEvents(token)
  return NextResponse.json({
    ...result,
    oauthPrepared: isGoogleOAuthConfigured(),
  })
}
