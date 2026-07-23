import { clamp01 } from './RealityUtils'
import type { RealityEvent, RealityEventKind } from './RealityTypes'

/** Declared / user / system-logged events are treated as facts. */
export function declaredEventConfidence(): number {
  return 1
}

/**
 * Confidence for inferred events.
 * Considers evidence count, average weight, recency, and consistency bonus.
 */
export function calculateInferredConfidence(input: {
  evidenceCount: number
  averageWeight: number
  hoursSinceNewest: number
  consistencyScore?: number
  contradictory?: boolean
}): number {
  const countFactor = clamp01(input.evidenceCount / 5)
  const weightFactor = clamp01(input.averageWeight)
  const recencyFactor = clamp01(1 - input.hoursSinceNewest / (24 * 14))
  const consistency = clamp01(input.consistencyScore ?? 0.6)
  let score = 0.25 * countFactor + 0.3 * weightFactor + 0.25 * recencyFactor + 0.2 * consistency
  if (input.contradictory) score *= 0.65
  return Math.round(clamp01(score) * 1000) / 1000
}

export function resolveEventConfidence(
  kind: RealityEventKind,
  confidence: number | undefined,
): number {
  if (kind === 'declared') return declaredEventConfidence()
  if (typeof confidence === 'number') return clamp01(confidence)
  return 0.55
}

export function formatConfidencePercent(confidence: number): string {
  return `${Math.round(clamp01(confidence) * 100)}%`
}

/** Assumptions must never be presented as hard facts in UI copy. */
export function isAssumption(event: Pick<RealityEvent, 'kind' | 'confidence'>): boolean {
  return event.kind === 'inferred' || event.confidence < 0.95
}
