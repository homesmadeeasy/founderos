import type { SourceAdapter } from './adapterTypes'
import { buildAdapterSignal, hoursAgo } from './adapterUtils'

export function createFileAdapter(getStatus: () => SourceAdapter['status'], getLastSync: () => string | undefined): SourceAdapter {
  return {
    id: 'file',
    name: 'Files',
    source: 'file',
    get status() { return getStatus() },
    get lastSyncedAt() { return getLastSync() },
    async testConnection() {
      return getStatus() === 'mock' || getStatus() === 'connected'
    },
    async sync() {
      return [
        buildAdapterSignal('file', 'file', {
          title: 'Economics notes updated',
          content: 'Modified: economics-lecture-4.md — added marginal cost summary.',
          timestamp: hoursAgo(3),
          syncKey: 'file-economics-notes',
          type: 'document',
          relatedObjectIds: [],
          metadata: { path: 'notes/economics-lecture-4.md' },
        }),
        buildAdapterSignal('file', 'file', {
          title: 'FounderOS architecture doc',
          content: 'Updated connected-reality-signal-engine.md with sync pipeline notes.',
          timestamp: hoursAgo(2),
          syncKey: 'file-architecture-doc',
          type: 'document',
          relatedObjectIds: [],
          metadata: { path: 'docs/connected-reality-signal-engine.md' },
        }),
      ]
    },
  }
}
