import type { FilteredFounderData } from './founderSignals'
import type { FounderInput } from './founderTypes'
import type { WorldModel } from '@/lib/cognitive-model/beliefTypes'
import { textMatchesValidation } from './founderSignals'

function clamp(n: number, min = 15, max = 95): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

export interface FounderScores {
  momentumScore: number
  productScore: number
  validationScore: number
  architectureScore: number
  executionScore: number
  riskScore: number
  uxScore: number
}

export function computeFounderScores(data: FilteredFounderData, input: FounderInput): FounderScores {
  const founderEval = input.domainIntelligence?.evaluations.find(e => e.domainId === 'founder')
  const domainScore = founderEval?.score ?? 50
  const reality = input.worldModel?.realitySnapshot

  // Architecture — technical progress, engines, docs, milestones
  let architectureScore = 35
  architectureScore += Math.min(data.architectureMemories.length * 6, 24)
  architectureScore += Math.min(data.technicalMemories.length * 4, 20)
  architectureScore += Math.min(data.knowledge.filter(k => k.domain === 'systems').length * 5, 15)
  if (data.codingSignals.length > 0) architectureScore += 10
  if (data.memories.some(m => m.content.toLowerCase().includes('home v1') || m.title.toLowerCase().includes('home'))) {
    architectureScore += 12
  }
  architectureScore = clamp(architectureScore)

  // Validation — user feedback, interviews, external testing
  let validationScore = 25
  validationScore += Math.min(data.validationMemories.length * 12, 36)
  const validationSignals = data.signals.filter(s =>
    textMatchesValidation(`${s.title} ${s.content}`),
  )
  validationScore += Math.min(validationSignals.length * 10, 20)
  const userOutcomes = input.outcomes.filter(o =>
    textMatchesValidation(`${o.prediction.decisionTitle} ${o.record?.actualResult ?? ''}`),
  )
  validationScore += Math.min(userOutcomes.length * 8, 16)
  if (architectureScore > 65 && validationScore < 40) validationScore -= 10
  if (reality?.validationScore && reality.validationScore > validationScore) {
    validationScore = reality.validationScore
  }
  const userReportedTesting = reality?.activeBeliefs.some(b =>
    b.predicate === 'validation.users_tested' && b.normalizedValue === 'true',
  )
  if (userReportedTesting) {
    validationScore = Math.max(validationScore, 48)
  }
  validationScore = clamp(validationScore, 10, 90)

  // Product — user-facing surfaces shipped
  let productScore = 30
  const productFeatures = [
    'home', 'capture', 'morning', 'evening', 'decision', 'domain', 'memory', 'knowledge',
  ]
  const memoryText = data.memories.map(m => `${m.title} ${m.content}`).join(' ').toLowerCase()
  for (const feat of productFeatures) {
    if (memoryText.includes(feat)) productScore += 5
  }
  productScore += Math.min(data.founderProjects.length * 4, 16)
  if (memoryText.includes('founderos home')) productScore += 10
  productScore = clamp(productScore)

  // UX — clarity and usability signals
  let uxScore = productScore * 0.5 + validationScore * 0.3
  if (reality?.positioningRisk && reality.positioningRisk > 55) uxScore -= 12
  if (data.memories.some(m => m.content.toLowerCase().includes('clutter') || m.content.toLowerCase().includes('ux'))) {
    uxScore -= 8
  }
  if (validationScore > 50) uxScore += 10
  uxScore = clamp(uxScore)

  // Execution — tasks done, outcomes, loops closed
  let executionScore = 40
  executionScore += Math.min(data.completedTasks.length * 5, 25)
  const goodOutcomes = input.outcomes.filter(o => o.record?.outcomeQuality === 'good' || o.record?.outcomeQuality === 'excellent')
  executionScore += Math.min(goodOutcomes.length * 6, 18)
  if (input.morningPlan?.completed) executionScore += 8
  if (input.eveningReview?.completed) executionScore += 10
  if (data.codingSignals.length > 0) executionScore += 8
  executionScore = clamp(executionScore)

  // Momentum — blend of domain score, coding, recent progress
  let momentumScore = domainScore * 0.4 + executionScore * 0.3 + productScore * 0.3
  if (data.codingSignals.length > 0) momentumScore += 8
  if (data.architectureMemories.length > 4 && validationScore < 35) momentumScore -= 12
  momentumScore = clamp(momentumScore)

  // Risk — higher = more risk (inverted health)
  let riskScore = 30
  if (architectureScore > 70 && validationScore < 40) riskScore += 25
  if (data.architectureMemories.length > 5 && data.validationMemories.length === 0) riskScore += 20
  if (data.openAppTasks > 8) riskScore += 10
  if (input.unprocessedCaptureCount && input.unprocessedCaptureCount > 5) riskScore += 8
  if (validationScore > 55) riskScore -= 15
  if (executionScore > 70) riskScore -= 10
  riskScore = clamp(riskScore, 15, 92)

  return {
    momentumScore,
    productScore,
    validationScore,
    architectureScore,
    executionScore,
    riskScore,
    uxScore,
  }
}

export function applyRealityBeliefsToScores(scores: FounderScores, world?: WorldModel | null): FounderScores {
  const snapshot = world?.realitySnapshot
  if (!snapshot) return scores
  return {
    ...scores,
    validationScore: Math.max(scores.validationScore, snapshot.validationScore),
    uxScore: snapshot.positioningRisk > 55
      ? Math.min(scores.uxScore, 100 - snapshot.positioningRisk)
      : scores.uxScore,
  }
}

export function inferFounderStage(scores: FounderScores, data: FilteredFounderData): import('./founderTypes').FounderStage {
  if (scores.validationScore >= 65 && scores.executionScore >= 60) return 'growth'
  if (scores.validationScore >= 45 || data.validationMemories.length >= 2) return 'validation'
  if (scores.productScore >= 55) return 'mvp'
  if (scores.architectureScore >= 45 || data.codingSignals.length > 0) return 'prototype'
  return 'idea'
}
