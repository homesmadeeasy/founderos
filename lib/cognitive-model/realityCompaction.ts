import type { RealityChange, RealityStoreMeta } from './realityTypes'
import { COGNITIVE_RETENTION } from './cognitiveRetention'

export function compactRealityMeta(meta: RealityStoreMeta): RealityStoreMeta {
  const keys = [...(meta.processedMessageKeys ?? [])]
  const dropped = keys.length > COGNITIVE_RETENTION.MAX_PROCESSED_MESSAGE_KEYS
    ? keys.length - COGNITIVE_RETENTION.MAX_PROCESSED_MESSAGE_KEYS
    : 0
  return {
    ...meta,
    version: 2,
    processedMessageKeys: keys.slice(-COGNITIVE_RETENTION.MAX_PROCESSED_MESSAGE_KEYS),
    droppedArchiveCount: (meta.droppedArchiveCount ?? 0) + dropped,
  }
}

export function pruneRealityChanges(changes: RealityChange[]): RealityChange[] {
  const seen = new Set<string>()
  const result: RealityChange[] = []
  for (const change of [...changes].reverse()) {
    const key = `${change.beliefId}:${change.newStatement}`
    if (seen.has(key)) continue
    seen.add(key)
    result.unshift(change)
  }
  return result.slice(-COGNITIVE_RETENTION.MAX_REALITY_CHANGES)
}

export function getRealityStorageDiagnostics(meta: RealityStoreMeta | undefined): {
  approximateBytes: number
  lastCompactionAt: string | null
  droppedArchiveCount: number
  processedMessageCount: number
} {
  return {
    approximateBytes: meta?.approximateBytes ?? 0,
    lastCompactionAt: meta?.lastCompactionAt ?? null,
    droppedArchiveCount: meta?.droppedArchiveCount ?? 0,
    processedMessageCount: meta?.processedMessageKeys?.length ?? 0,
  }
}
