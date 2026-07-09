import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import { buildMemoryFromSignal } from './signalMemoryBridge'
import { classifySignal, isImportantSignal } from './signalClassifier'
import { createSignal, getSignalById, updateSignal } from './signalStorage'
import { buildSignalFromCapture } from './signalSources'
import type { CreateSignalInput, Signal } from './signalTypes'
import { newSignalId, nowISO } from './signalUtils'

export interface ProcessSignalDeps {
  recordMemory: (input: CreateMemoryInput) => MemoryRecord | null
}

export function ingestSignal(input: CreateSignalInput, deps?: ProcessSignalDeps): Signal {
  const classification = classifySignal(input.source, input.title, input.content)
  const signal = createSignal({
    ...input,
    type: input.type ?? classification.type,
    confidence: input.confidence ?? classification.confidence,
    metadata: {
      ...input.metadata,
      classificationReason: classification.reason,
    },
  })

  if (deps && isImportantSignal(signal.type, signal.confidence) && !signal.processed) {
    return processSignal(signal.id, deps) ?? signal
  }

  return signal
}

export function processSignal(id: string, deps: ProcessSignalDeps): Signal | null {
  const signal = getSignalById(id)
  if (!signal || signal.processed) return signal

  const memInput = buildMemoryFromSignal(signal)
  const memoryIds = [...signal.relatedMemoryIds]

  if (memInput) {
    const memory = deps.recordMemory(memInput)
    if (memory) memoryIds.push(memory.id)
  }

  return updateSignal(id, {
    processed: true,
    relatedMemoryIds: [...new Set(memoryIds)],
    metadata: {
      ...signal.metadata,
      processedAt: nowISO(),
    },
  })
}

export function createSignalFromCapture(capture: {
  id: string
  rawInput: string
  parsedTitle: string
  parsedContent: string
  classification: string
  createdObjectId?: string
  createdMemoryId?: string
}, deps?: ProcessSignalDeps): Signal {
  const input = buildSignalFromCapture({
    captureId: capture.id,
    rawInput: capture.rawInput,
    title: capture.parsedTitle,
    content: capture.parsedContent,
    classification: capture.classification,
    objectId: capture.createdObjectId,
    memoryId: capture.createdMemoryId,
  })

  if (capture.createdMemoryId) {
    input.relatedMemoryIds = [capture.createdMemoryId]
  }

  return ingestSignal(input, deps)
}

export function createMockSignal(overrides?: Partial<CreateSignalInput>): Signal {
  return createSignal({
    source: 'future_api',
    type: 'system',
    title: 'Mock signal',
    content: 'User-added mock signal for testing Connected Reality.',
    timestamp: nowISO(),
    confidence: 'medium',
    relatedObjectIds: [],
    metadata: { mock: true, userAdded: true },
    ...overrides,
  })
}
