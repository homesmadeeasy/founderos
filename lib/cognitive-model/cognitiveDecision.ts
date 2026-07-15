import type { DecisionInput } from '@/lib/decision-engine/decisionTypes'
import type { WorldModel } from './beliefTypes'
import { normalizeWorldModel } from './cognitiveNormalize'

export function applyWorldModelToDecisionScoring(
  breakdown: { strategicAlignment: number; riskReduction: number; momentum: number; lowConfidencePenalty: number },
  world: WorldModel | null | undefined,
  candidateTags: string[],
): void {
  if (!world) return
  const model = normalizeWorldModel(world)

  const validationLow = model.validation.score < 50
  const executionHigh = model.execution.score > 65
  const openHypotheses = model.currentHypotheses.filter((h) => h.status === 'open').length
  const snapshot = model.realitySnapshot
  const userTested = snapshot?.activeBeliefs.some(b =>
    b.predicate === 'validation.users_tested' && b.normalizedValue === 'true',
  )
  const positioningWeak = snapshot && snapshot.positioningRisk > 55

  if (validationLow && candidateTags.some((t) => ['validation', 'founderos', 'user-test'].includes(t))) {
    breakdown.strategicAlignment += 12
    breakdown.riskReduction += 10
  }

  if (userTested && positioningWeak && candidateTags.some(t => ['ux', 'copy', 'onboarding', 'positioning'].includes(t))) {
    breakdown.strategicAlignment += 18
    breakdown.riskReduction += 14
    breakdown.momentum += 6
  }

  if (userTested && candidateTags.some(t => ['validation', 'user-test', 'first-users'].includes(t))) {
    breakdown.strategicAlignment -= 8
  }

  if (executionHigh && validationLow && candidateTags.includes('founderos')) {
    breakdown.momentum -= 5
    breakdown.strategicAlignment += 8
  }

  if (openHypotheses > 0 && candidateTags.includes('validation')) {
    breakdown.riskReduction += 6
  }

  if (model.confidenceLevels.overall != null && model.confidenceLevels.overall < 40) {
    breakdown.lowConfidencePenalty += 4
  }

  for (const risk of model.currentRisks.slice(0, 2)) {
    const lower = risk.toLowerCase()
    if (candidateTags.some((t) => lower.includes(t))) {
      breakdown.riskReduction += 8
    }
  }
}

export function worldModelRisksForDecision(world: WorldModel | null | undefined): string[] {
  if (!world) return []
  const model = normalizeWorldModel(world)
  return [
    ...model.currentRisks.slice(0, 2),
    ...model.unknowns.filter((u) => u.importance === 'critical').map((u) => `Unknown: ${u.statement}`),
  ].slice(0, 4)
}

export function attachWorldModelToDecisionInput(input: DecisionInput, world: WorldModel | null): DecisionInput {
  return { ...input, worldModel: world }
}
