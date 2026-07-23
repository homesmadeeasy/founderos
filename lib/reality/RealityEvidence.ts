import type { RealityEvidence, RealitySource } from './RealityTypes'
import { clamp01, newRealityId, nowISO } from './RealityUtils'

export function createEvidence(input: {
  summary: string
  source: RealitySource
  detail?: string
  observedAt?: string
  weight?: number
  eventId?: string
  metadata?: Record<string, unknown>
}): RealityEvidence {
  const now = nowISO()
  return {
    id: newRealityId('ev'),
    eventId: input.eventId,
    source: input.source,
    summary: input.summary.trim(),
    detail: input.detail,
    observedAt: input.observedAt ?? now,
    weight: clamp01(input.weight ?? 0.8),
    metadata: input.metadata,
    createdAt: now,
  }
}

export function averageEvidenceWeight(evidence: RealityEvidence[]): number {
  if (!evidence.length) return 0
  return evidence.reduce((sum, e) => sum + e.weight, 0) / evidence.length
}

export function evidenceForEvent(
  all: RealityEvidence[],
  eventId: string,
  evidenceIds: string[],
): RealityEvidence[] {
  const byId = new Set(evidenceIds)
  return all.filter(e => e.eventId === eventId || byId.has(e.id))
}
