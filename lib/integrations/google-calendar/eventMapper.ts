import type { CreateSignalInput, SignalType } from '@/lib/signal-engine/signalTypes'
import { classifySignal } from '@/lib/signal-engine/signalClassifier'
import type { GoogleCalendarEvent } from './types'

function resolveEventStart(event: GoogleCalendarEvent): string {
  return event.start.dateTime ?? event.start.date ?? new Date().toISOString()
}

function resolveEventEnd(event: GoogleCalendarEvent): string | undefined {
  return event.end.dateTime ?? event.end.date
}

function inferSignalType(title: string, content: string): SignalType {
  const lower = `${title} ${content}`.toLowerCase()
  if (lower.includes('study') || lower.includes('class') || lower.includes('lecture')) return 'event'
  if (lower.includes('gym') || lower.includes('workout') || lower.includes('train')) return 'event'
  if (lower.includes('due') || lower.includes('deadline') || lower.includes('assignment') || lower.includes('reminder')) {
    return 'reminder'
  }
  if (lower.includes('task') || lower.includes('todo')) return 'task'
  return 'event'
}

function buildContent(event: GoogleCalendarEvent, start: string, end?: string): string {
  const parts: string[] = []
  const startFmt = start.replace('T', ' ').slice(0, 16)
  const endFmt = end ? end.replace('T', ' ').slice(0, 16) : null
  parts.push(endFmt ? `${startFmt} – ${endFmt}` : startFmt)
  if (event.location) parts.push(`Location: ${event.location}`)
  if (event.description) parts.push(event.description.slice(0, 280))
  return parts.join(' · ')
}

export function mapGoogleEventToSignal(event: GoogleCalendarEvent): CreateSignalInput {
  const title = event.summary?.trim() || 'Calendar event'
  const start = resolveEventStart(event)
  const end = resolveEventEnd(event)
  const content = buildContent(event, start, end)
  const type = inferSignalType(title, content)
  const cls = classifySignal('calendar', title, content)
  const attendeeCount = event.attendees?.length ?? 0

  return {
    source: 'calendar',
    type: type === 'event' ? cls.type : type,
    title,
    content,
    timestamp: start,
    confidence: 'high',
    relatedObjectIds: [],
    metadata: {
      synced: true,
      provider: 'google',
      adapterId: 'google-calendar',
      calendarEventId: event.id,
      start,
      end,
      location: event.location,
      attendeesCount: attendeeCount,
      htmlLink: event.htmlLink,
      syncKey: `gcal:${event.id}`,
      classificationReason: cls.reason,
    },
  }
}

export function mapGoogleEventsToSignals(events: GoogleCalendarEvent[]): CreateSignalInput[] {
  return events
    .filter(e => e.status !== 'cancelled')
    .map(mapGoogleEventToSignal)
}
