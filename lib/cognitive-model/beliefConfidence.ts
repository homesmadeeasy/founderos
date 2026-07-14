import type { Belief, BeliefEvidence, BeliefStatus } from './beliefTypes'
import { clampConfidence, statusFromConfidence } from './cognitiveUtils'

export function computeBeliefConfidence(
  baseConfidence: number,
  supporting: BeliefEvidence[],
  contradicting: BeliefEvidence[],
): number {
  let score = baseConfidence
  for (const e of supporting) {
    score += e.weight * 12 * (e.supports ? 1 : -0.5)
  }
  for (const e of contradicting) {
    score -= e.weight * 15
  }
  return clampConfidence(score)
}

export function deriveStatus(confidence: number, hasContradictions: boolean): BeliefStatus {
  if (hasContradictions && confidence < 50) return 'contradicted'
  return statusFromConfidence(confidence)
}

export function confidenceDeltaReason(
  prev: number,
  next: number,
  trigger: string,
): string {
  const delta = next - prev
  if (delta > 0) return `Confidence increased by ${delta} because ${trigger}`
  if (delta < 0) return `Confidence decreased by ${Math.abs(delta)} because ${trigger}`
  return `Confidence unchanged after ${trigger}`
}

export function applyEvidenceToBelief(belief: Belief, evidence: BeliefEvidence): Belief {
  const supporting = evidence.supports
    ? [...belief.supportingEvidence, evidence]
    : belief.supportingEvidence
  const contradicting = !evidence.supports
    ? [...belief.contradictingEvidence, evidence]
    : belief.contradictingEvidence

  const confidence = computeBeliefConfidence(
    belief.confidence,
    supporting,
    contradicting,
  )
  const status = deriveStatus(confidence, contradicting.length > 0 && supporting.length > 0)

  return {
    ...belief,
    supportingEvidence: supporting,
    contradictingEvidence: contradicting,
    confidence,
    status,
  }
}
