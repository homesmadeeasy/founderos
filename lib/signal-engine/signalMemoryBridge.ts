import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import type { Signal } from './signalTypes'
import { nowISO } from './signalUtils'

export function buildMemoryFromSignal(signal: Signal): CreateMemoryInput | null {
  if (!['health', 'workout', 'coding_session', 'event', 'reminder', 'idea'].includes(signal.type)) {
    return null
  }

  const typeMap: Partial<Record<Signal['type'], CreateMemoryInput['type']>> = {
    health: 'health_log',
    workout: 'health_log',
    coding_session: 'project_update',
    event: 'event',
    reminder: 'capture',
    idea: 'capture',
  }

  const importance = signal.confidence === 'high' ? 'high' : 'medium'

  return {
    type: typeMap[signal.type] ?? 'event',
    title: `Signal: ${signal.title}`,
    content: signal.content,
    summary: `From ${signal.source} signal (${signal.type}).`,
    importance,
    area: signal.type === 'health' || signal.type === 'workout' ? 'health' : 'systems',
    source: 'system',
    relatedObjectIds: signal.relatedObjectIds,
    tags: [
      'signal',
      `signal:${signal.id}`,
      `signal-source:${signal.source}`,
      `dedupe:signal-${signal.id}`,
    ],
    occurredAt: signal.timestamp,
  }
}
