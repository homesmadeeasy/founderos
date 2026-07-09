import type { SourceAdapter } from './adapterTypes'
import { buildAdapterSignal, todayAt, tomorrowAt, daysFromNowAt } from './adapterUtils'

export function createCalendarAdapter(getStatus: () => SourceAdapter['status'], getLastSync: () => string | undefined): SourceAdapter {
  return {
    id: 'calendar',
    name: 'Calendar',
    source: 'calendar',
    get status() { return getStatus() },
    get lastSyncedAt() { return getLastSync() },
    async testConnection() {
      return getStatus() === 'mock' || getStatus() === 'connected'
    },
    async sync() {
      return [
        buildAdapterSignal('calendar', 'calendar', {
          title: 'Economics study block today',
          content: 'Study block today 2:00 PM – 4:00 PM. Review lecture notes before session.',
          timestamp: todayAt(14),
          syncKey: 'calendar-study-today',
          relatedObjectIds: [],
          metadata: {
            calendarEvent: true,
            durationMinutes: 120,
            provider: 'mock',
            calendarEventId: 'mock-study-today',
            start: todayAt(14),
          },
        }),
        buildAdapterSignal('calendar', 'calendar', {
          title: 'Gym session tomorrow',
          content: 'Gym session scheduled tomorrow 7:00 AM — upper body strength.',
          timestamp: tomorrowAt(7),
          syncKey: 'calendar-gym-tomorrow',
          relatedObjectIds: [],
          metadata: {
            calendarEvent: true,
            workout: true,
            provider: 'mock',
            calendarEventId: 'mock-gym-tomorrow',
            start: tomorrowAt(7),
          },
        }),
        buildAdapterSignal('calendar', 'calendar', {
          title: 'Assignment due next week',
          content: 'Economics assignment due in 7 days — start outline this weekend.',
          timestamp: daysFromNowAt(7, 23, 59),
          syncKey: 'calendar-assignment-due',
          type: 'reminder',
          relatedObjectIds: [],
          metadata: {
            priority: 'high',
            domain: 'school',
            provider: 'mock',
            calendarEventId: 'mock-assignment-due',
            start: daysFromNowAt(7, 23, 59),
          },
        }),
      ]
    },
  }
}
