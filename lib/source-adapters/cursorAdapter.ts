import type { SourceAdapter } from './adapterTypes'
import { buildAdapterSignal, hoursAgo } from './adapterUtils'

export function createCursorAdapter(getStatus: () => SourceAdapter['status'], getLastSync: () => string | undefined): SourceAdapter {
  return {
    id: 'cursor',
    name: 'Cursor',
    source: 'cursor',
    get status() { return getStatus() },
    get lastSyncedAt() { return getLastSync() },
    async testConnection() {
      return getStatus() === 'mock' || getStatus() === 'connected'
    },
    async sync() {
      return [
        buildAdapterSignal('cursor', 'cursor', {
          title: 'FounderOS coding session',
          content: '2.5 hour session on FounderOS — source adapters and sync engine.',
          timestamp: hoursAgo(5),
          syncKey: 'cursor-session-founderos',
          type: 'coding_session',
          relatedObjectIds: [],
          metadata: { durationMinutes: 150, project: 'FounderOS' },
        }),
        buildAdapterSignal('cursor', 'cursor', {
          title: '12 files changed',
          content: 'Session touched signal-engine, sync-engine, and settings integration files.',
          timestamp: hoursAgo(5),
          syncKey: 'cursor-files-changed',
          type: 'activity',
          relatedObjectIds: [],
          metadata: { filesChanged: 12 },
        }),
        buildAdapterSignal('cursor', 'cursor', {
          title: 'Build error fixed',
          content: 'Resolved TypeScript error in signal classifier — build passing again.',
          timestamp: hoursAgo(4),
          syncKey: 'cursor-build-fixed',
          type: 'system',
          relatedObjectIds: [],
          metadata: { buildStatus: 'passing' },
        }),
      ]
    },
  }
}
