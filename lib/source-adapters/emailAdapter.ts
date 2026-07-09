import type { SourceAdapter } from './adapterTypes'
import { buildAdapterSignal, hoursAgo } from './adapterUtils'

export function createEmailAdapter(getStatus: () => SourceAdapter['status'], getLastSync: () => string | undefined): SourceAdapter {
  return {
    id: 'email',
    name: 'Email',
    source: 'email',
    get status() { return getStatus() },
    get lastSyncedAt() { return getLastSync() },
    async testConnection() {
      return getStatus() === 'mock' || getStatus() === 'connected'
    },
    async sync() {
      return [
        buildAdapterSignal('email', 'email', {
          title: 'Important school reminder',
          content: 'Professor reminder: midterm review session Monday — bring problem set 4.',
          timestamp: hoursAgo(7),
          syncKey: 'email-school-reminder',
          type: 'reminder',
          relatedObjectIds: [],
          metadata: { priority: 'high', domain: 'school' },
        }),
        buildAdapterSignal('email', 'email', {
          title: 'Finance statement available',
          content: 'Monthly account statement ready — review subscriptions and runway.',
          timestamp: hoursAgo(9),
          syncKey: 'email-finance',
          type: 'message',
          relatedObjectIds: [],
          metadata: { domain: 'finance' },
        }),
        buildAdapterSignal('email', 'email', {
          title: 'Calendar invite: team sync',
          content: 'Invite accepted: FounderOS planning sync Thursday 3:00 PM.',
          timestamp: hoursAgo(6),
          syncKey: 'email-calendar-invite',
          type: 'event',
          relatedObjectIds: [],
          metadata: { invite: true },
        }),
      ]
    },
  }
}
