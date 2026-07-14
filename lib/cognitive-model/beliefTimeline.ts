import type { CognitiveStore, CognitiveTimelineEntry } from './beliefTypes'
import { newCognitiveId, nowISO } from './cognitiveUtils'
import { COGNITIVE_RETENTION } from './cognitiveRetention'

export function appendTimeline(
  store: CognitiveStore,
  entry: Omit<CognitiveTimelineEntry, 'id' | 'timestamp'>,
): CognitiveStore {
  const recent = store.timeline[0]
  if (recent && recent.title === entry.title && recent.detail === entry.detail && recent.type === entry.type) {
    return store
  }
  const full: CognitiveTimelineEntry = {
    ...entry,
    id: newCognitiveId('tl'),
    timestamp: nowISO(),
  }
  return {
    ...store,
    timeline: [full, ...store.timeline].slice(0, COGNITIVE_RETENTION.MAX_TIMELINE),
  }
}

export function timelineSince(store: CognitiveStore, sinceISO: string): CognitiveTimelineEntry[] {
  const since = new Date(sinceISO).getTime()
  return store.timeline.filter((e) => new Date(e.timestamp).getTime() > since)
}

export function timelineSummary(entries: CognitiveTimelineEntry[]): string {
  if (entries.length === 0) return 'Nothing notable has changed in the cognitive model recently.'
  return entries.slice(0, 5).map((e) => `• ${e.title}: ${e.detail}`).join('\n')
}
