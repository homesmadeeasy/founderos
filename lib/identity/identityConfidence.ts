/**
 * Dynamic confidence for observed identity facts.
 * Declared facts are treated as confidence 1.0 unless explicitly edited away.
 */

export interface ConfidenceInputs {
  observationCount: number
  /** 0–1 average evidence weight */
  averageWeight: number
  /** Fraction of recent window supporting the claim (0–1) */
  consistency: number
  /** Days since newest supporting evidence */
  daysSinceLastEvidence: number
  /** Number of contradictory signals */
  contradictionCount: number
  /** User confirmed this observation */
  manuallyConfirmed?: boolean
  /** User rejected / corrected */
  manuallyRejected?: boolean
  previousConfidence?: number
}

/** Returns confidence in [0, 1]. */
export function calculateObservationConfidence(input: ConfidenceInputs): number {
  if (input.manuallyRejected) {
    return clamp(Math.min(input.previousConfidence ?? 0.4, 0.25))
  }
  if (input.manuallyConfirmed) {
    return 1
  }

  const countFactor = 1 - Math.exp(-(input.observationCount || 0) / 6)
  const weightFactor = clamp(input.averageWeight)
  const consistencyFactor = clamp(input.consistency)
  const recencyFactor = input.daysSinceLastEvidence <= 7
    ? 1
    : input.daysSinceLastEvidence <= 30
      ? 0.85
      : input.daysSinceLastEvidence <= 90
        ? 0.65
        : 0.4
  const contradictionPenalty = Math.min(0.45, (input.contradictionCount || 0) * 0.12)

  const raw =
    0.35 * countFactor
    + 0.25 * weightFactor
    + 0.25 * consistencyFactor
    + 0.15 * recencyFactor
    - contradictionPenalty

  return clamp(raw)
}

export function declaredConfidence(): number {
  return 1
}

export function daysBetween(isoA: string, isoB: string = new Date().toISOString()): number {
  const a = Date.parse(isoA)
  const b = Date.parse(isoB)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 999
  return Math.max(0, Math.round(Math.abs(b - a) / 86_400_000))
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, Math.round(n * 1000) / 1000))
}

export function formatConfidencePercent(confidence: number): string {
  return `${Math.round(clamp(confidence) * 100)}%`
}
