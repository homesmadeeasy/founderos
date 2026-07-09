import type { OutcomeCompleted, OutcomeQuality, OutcomeRecord } from './outcomeTypes'
import type { CandidateAction } from '@/lib/decision-engine/decisionTypes'
import type { SimilarOutcomeMatch } from './outcomeTypes'
import { extractDecisionKeywords } from './outcomeUtils'

export function qualityToScore(quality: OutcomeQuality): number {
  switch (quality) {
    case 'excellent': return 95
    case 'good': return 75
    case 'neutral': return 50
    case 'poor': return 20
    default: return 40
  }
}

export function completedToMultiplier(completed: OutcomeCompleted): number {
  switch (completed) {
    case 'yes': return 1
    case 'partial': return 0.5
    case 'no': return 0
    default: return 0.3
  }
}

export function computeAccuracyScore(
  completed: OutcomeCompleted,
  quality: OutcomeQuality,
): number {
  const base = qualityToScore(quality)
  const follow = completedToMultiplier(completed)
  return Math.round(base * follow + (follow < 1 ? 10 : 0))
}

export function computeFutureWeightChange(
  completed: OutcomeCompleted,
  quality: OutcomeQuality,
): number {
  const accuracy = computeAccuracyScore(completed, quality)
  if (accuracy >= 80) return 8
  if (accuracy >= 60) return 4
  if (accuracy >= 40) return 0
  if (accuracy >= 20) return -4
  return -8
}

export function computeConfidenceAdjustment(
  completed: OutcomeCompleted,
  quality: OutcomeQuality,
): number {
  const change = computeFutureWeightChange(completed, quality)
  if (completed === 'no' && quality === 'neutral') return -2
  return Math.round(change / 2)
}

export interface OutcomeFeedbackAdjustment {
  scoreBonus: number
  urgencyPenalty: number
  reason?: string
}

export function applyOutcomeFeedbackToCandidate(
  candidate: CandidateAction,
  similar: SimilarOutcomeMatch[],
): OutcomeFeedbackAdjustment {
  if (similar.length === 0) {
    return { scoreBonus: 0, urgencyPenalty: 0 }
  }

  const keywords = extractDecisionKeywords(candidate.title, candidate.area)
  let scoreBonus = 0
  let urgencyPenalty = 0
  const reasons: string[] = []

  for (const match of similar) {
    if (!match.record || !match.evaluation) continue
    const matchKeywords = extractDecisionKeywords(
      match.prediction.decisionTitle,
      match.prediction.decisionArea,
    )
    const overlaps = keywords.some(k => matchKeywords.includes(k))
    if (!overlaps && !candidate.title.toLowerCase().includes(match.prediction.decisionTitle.toLowerCase().slice(0, 12))) {
      continue
    }

    const weight = match.evaluation.futureWeightChange
    const completed = match.record.completed
    const quality = match.record.outcomeQuality

    if (completed === 'yes' && (quality === 'good' || quality === 'excellent')) {
      scoreBonus += Math.max(3, weight)
      reasons.push(`"${match.prediction.decisionTitle}" worked before (+${weight})`)
    } else if (completed === 'no' && quality === 'neutral') {
      urgencyPenalty += 3
      reasons.push(`Ignoring "${match.prediction.decisionTitle}" had no negative effect`)
    } else if (quality === 'poor' || (completed === 'no' && quality !== 'neutral')) {
      scoreBonus += Math.min(-3, weight)
      reasons.push(`"${match.prediction.decisionTitle}" led to poor outcomes (${weight})`)
    }
  }

  scoreBonus = Math.max(-15, Math.min(15, scoreBonus))
  urgencyPenalty = Math.max(0, Math.min(10, urgencyPenalty))

  return {
    scoreBonus,
    urgencyPenalty,
    reason: reasons.length > 0 ? reasons[0] : undefined,
  }
}

export function computeSuccessRate(records: OutcomeRecord[]): { wins: number; total: number } {
  const evaluated = records.filter(r => r.completed === 'yes' || r.completed === 'partial')
  const wins = evaluated.filter(
    r => r.outcomeQuality === 'good' || r.outcomeQuality === 'excellent',
  ).length
  return { wins, total: evaluated.length }
}
