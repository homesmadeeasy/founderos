import type { SourceAdapter } from './adapterTypes'
import { buildAdapterSignal, hoursAgo } from './adapterUtils'

export function createGithubAdapter(getStatus: () => SourceAdapter['status'], getLastSync: () => string | undefined): SourceAdapter {
  return {
    id: 'github',
    name: 'GitHub',
    source: 'github',
    get status() { return getStatus() },
    get lastSyncedAt() { return getLastSync() },
    async testConnection() {
      return getStatus() === 'mock' || getStatus() === 'connected'
    },
    async sync() {
      return [
        buildAdapterSignal('github', 'github', {
          title: 'Pushed signal engine commit',
          content: 'Commit on main: feat Connected Reality signal engine — 26 files changed.',
          timestamp: hoursAgo(6),
          syncKey: 'github-commit-founderos',
          type: 'coding_session',
          relatedObjectIds: [],
          metadata: { repo: 'founderos', branch: 'main', filesChanged: 26 },
        }),
        buildAdapterSignal('github', 'github', {
          title: 'PR review requested',
          content: 'Review requested on PR #12 — source adapters milestone.',
          timestamp: hoursAgo(4),
          syncKey: 'github-pr-review',
          type: 'task',
          relatedObjectIds: [],
          metadata: { prNumber: 12 },
        }),
      ]
    },
  }
}
