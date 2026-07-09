import type { ConfidenceLabel, DecisionUrgency, DecisionImportance } from './decisionTypes'

import type { DecisionInput } from './decisionTypes'

export function newDecisionId(prefix = 'dec'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function urgencyToScore(urgency: DecisionUrgency): number {
  switch (urgency) {
    case 'critical': return 95
    case 'high': return 75
    case 'medium': return 50
    case 'low': return 25
    default: return 40
  }
}

export function importanceToScore(importance: DecisionImportance): number {
  switch (importance) {
    case 'critical': return 95
    case 'high': return 75
    case 'medium': return 50
    case 'low': return 25
    default: return 40
  }
}

export function scoreToConfidenceLabel(score: number): ConfidenceLabel {
  if (score >= 70) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

export function scoreToUrgency(score: number): DecisionUrgency {
  if (score >= 85) return 'critical'
  if (score >= 65) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function scoreToImportance(score: number): DecisionImportance {
  if (score >= 85) return 'critical'
  if (score >= 65) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function textIncludesAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase()
  return terms.some(t => lower.includes(t))
}

/** Ensure all array fields exist before scoring/gathering candidates. */
export function normalizeDecisionInput(input: DecisionInput): DecisionInput {
  return {
    ...input,
    objects: input.objects ?? [],
    memories: input.memories ?? [],
    knowledge: input.knowledge ?? [],
    signals: input.signals ?? [],
    morningPlan: input.morningPlan ?? null,
    eveningReview: input.eveningReview ?? null,
    executiveState: {
      recommendations: input.executiveState?.recommendations ?? [],
      warnings: input.executiveState?.warnings ?? [],
      tradeoffs: input.executiveState?.tradeoffs ?? [],
      healthSignals: input.executiveState?.healthSignals ?? null,
    },
    reasoningOutput: input.reasoningOutput ?? null,
    unresolvedCaptureCount: input.unresolvedCaptureCount ?? 0,
    domainCoordinator: input.domainCoordinator ?? null,
    currentTime: input.currentTime ?? nowISO(),
  }
}
