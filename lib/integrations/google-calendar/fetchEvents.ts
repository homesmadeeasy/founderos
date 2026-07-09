import type { GoogleCalendarEvent, GoogleCalendarEventsResponse } from './types'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

function defaultTimeRange(): { timeMin: string; timeMax: string } {
  const now = new Date()
  const past = new Date(now)
  past.setDate(past.getDate() - 1)
  const future = new Date(now)
  future.setDate(future.getDate() + 14)
  return {
    timeMin: past.toISOString(),
    timeMax: future.toISOString(),
  }
}

export async function fetchGoogleCalendarEvents(accessToken: string): Promise<GoogleCalendarEventsResponse> {
  const token = accessToken.trim()
  if (!token) {
    return { ok: false, error: 'Google Calendar is not connected yet.', connected: false, mode: 'none' }
  }

  const { timeMin, timeMax } = defaultTimeRange()
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })

  try {
    const res = await fetch(`${CALENDAR_API}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (res.status === 401) {
      return {
        ok: false,
        error: 'Google Calendar token expired or invalid. Reconnect in Settings.',
        connected: false,
        mode: 'manual_token',
      }
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        ok: false,
        error: `Google Calendar API error (${res.status}).${body ? ` ${body.slice(0, 120)}` : ''}`,
        connected: true,
        mode: 'manual_token',
      }
    }

    const data = await res.json() as { items?: GoogleCalendarEvent[] }
    return {
      ok: true,
      events: data.items ?? [],
      connected: true,
      mode: 'manual_token',
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach Google Calendar.',
      connected: false,
      mode: 'manual_token',
    }
  }
}
