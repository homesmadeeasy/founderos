export interface GoogleCalendarEventTime {
  dateTime?: string
  date?: string
  timeZone?: string
}

export interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start: GoogleCalendarEventTime
  end: GoogleCalendarEventTime
  attendees?: Array<{ email?: string; responseStatus?: string }>
  status?: string
}

export interface GoogleCalendarEventsResponse {
  ok: boolean
  events?: GoogleCalendarEvent[]
  error?: string
  connected?: boolean
  mode?: 'manual_token' | 'oauth' | 'none'
}
