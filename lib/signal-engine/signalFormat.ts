/** Deterministic UTC formatting — safe for SSR hydration (no locale / Date.now). */

export function formatSignalTimestamp(timestamp?: string): string {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toISOString().replace('T', ' ').slice(0, 16)
}

export function formatCalendarEventTime(timestamp?: string, end?: string): string {
  if (!timestamp) return 'Time unknown'
  const start = formatSignalTimestamp(timestamp)
  if (!end) return start
  const endFmt = formatSignalTimestamp(end)
  return `${start} – ${endFmt}`
}

export function getCalendarProviderLabel(metadata?: Record<string, unknown>): string {
  const provider = metadata?.provider
  if (provider === 'google') return 'Google Calendar'
  if (provider === 'mock') return 'Mock Calendar'
  const adapterId = metadata?.adapterId
  if (adapterId === 'google-calendar') return 'Google Calendar'
  if (adapterId === 'calendar') return 'Mock Calendar'
  return 'Calendar'
}

export function connectionModeLabel(mode?: string): string {
  switch (mode) {
    case 'mock': return 'Mock mode'
    case 'manual_token': return 'Manual token'
    case 'oauth': return 'OAuth'
    default: return 'Not connected'
  }
}
