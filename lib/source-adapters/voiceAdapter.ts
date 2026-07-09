import type { SourceAdapter } from './adapterTypes'
import { buildAdapterSignal, hoursAgo } from './adapterUtils'

export function createVoiceAdapter(getStatus: () => SourceAdapter['status'], getLastSync: () => string | undefined): SourceAdapter {
  return {
    id: 'voice',
    name: 'Voice',
    source: 'voice',
    get status() { return getStatus() },
    get lastSyncedAt() { return getLastSync() },
    async testConnection() {
      return getStatus() === 'mock' || getStatus() === 'connected'
    },
    async sync() {
      return [
        buildAdapterSignal('voice', 'voice', {
          title: 'Voice capture placeholder',
          content: 'Mock voice note: "Remind me to sync calendar before morning plan." — awaiting real voice assistant.',
          timestamp: hoursAgo(2),
          syncKey: 'voice-capture-placeholder',
          type: 'idea',
          relatedObjectIds: [],
          metadata: { placeholder: true, transcript: 'Remind me to sync calendar before morning plan.' },
        }),
      ]
    },
  }
}
