import type { CaptureClassification } from './captureTypes'
import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import { nowISO } from './captureUtils'

export function buildMemoryFromCapture(
  signalId: string,
  classification: CaptureClassification,
  content: string,
  confidence: string,
): CreateMemoryInput {
  const typeMap: Partial<Record<CaptureClassification, CreateMemoryInput['type']>> = {
    task: 'task_update',
    idea: 'capture',
    book: 'capture',
    goal: 'capture',
    question: 'capture',
    memory: 'reflection',
    reflection: 'reflection',
    decision: 'decision',
    person: 'capture',
    meeting: 'event',
    meal: 'health_log',
    workout: 'health_log',
    note: 'capture',
    unknown: 'capture',
  }

  const areaMap: Partial<Record<CaptureClassification, CreateMemoryInput['area']>> = {
    workout: 'health',
    meal: 'health',
    book: 'knowledge',
    goal: 'growth',
    decision: 'systems',
  }

  const memoryType = typeMap[classification] ?? 'capture'
  const importance = classification === 'decision' ? 'high'
    : classification === 'reflection' || classification === 'memory' ? 'medium'
      : 'medium'

  return {
    type: memoryType,
    title: `${classification} captured: ${content.slice(0, 60)}${content.length > 60 ? '…' : ''}`,
    content,
    summary: `Universal capture (${classification}, ${confidence} confidence).`,
    importance,
    area: areaMap[classification],
    source: 'quick_capture',
    relatedObjectIds: [signalId],
    tags: [
      'universal-capture',
      'capture',
      classification,
      `dedupe:universal-capture-${signalId}`,
    ],
    occurredAt: nowISO(),
  }
}
