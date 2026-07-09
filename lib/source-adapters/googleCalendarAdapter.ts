import { mapGoogleEventsToSignals } from '@/lib/integrations/google-calendar/eventMapper'
import { getGoogleCalendarToken, hasGoogleCalendarToken } from '@/lib/integrations/google-calendar/tokenStorage'
import type { GoogleCalendarEventsResponse } from '@/lib/integrations/google-calendar/types'
import type { CreateSignalInput } from '@/lib/signal-engine/signalTypes'
import type { SourceAdapter } from './adapterTypes'

async function fetchEventsFromApi(token?: string | null): Promise<GoogleCalendarEventsResponse> {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch('/api/integrations/google-calendar/events', {
    headers,
    cache: 'no-store',
  })

  return res.json() as Promise<GoogleCalendarEventsResponse>
}

export function createGoogleCalendarAdapter(
  getStatus: () => SourceAdapter['status'],
  getLastSync: () => string | undefined,
): SourceAdapter {
  return {
    id: 'google-calendar',
    name: 'Google Calendar',
    source: 'calendar',
    get status() { return getStatus() },
    get lastSyncedAt() { return getLastSync() },
    async testConnection() {
      if (getStatus() !== 'connected') return false
      return hasGoogleCalendarToken()
    },
    async sync(): Promise<CreateSignalInput[]> {
      const token = getGoogleCalendarToken()
      const result = await fetchEventsFromApi(token)

      if (!result.ok) {
        throw new Error(result.error ?? 'Google Calendar is not connected yet.')
      }

      if (!result.events?.length) return []
      return mapGoogleEventsToSignals(result.events)
    },
  }
}
