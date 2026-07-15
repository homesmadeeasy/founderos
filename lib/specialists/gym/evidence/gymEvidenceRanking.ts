import type { GymEvidenceClaim } from './gymEvidenceTypes'
import type { ApplicabilityResult } from './gymEvidenceTypes'
import type { PrescriptionContext } from './gymEvidenceTypes'
import { mapGymGoalToTrainingGoal } from './gymEvidenceClaims'
import { getResearchSource } from './gymEvidenceRegistry'
import { isSourceOutdated } from './gymEvidenceCitations'

const EVIDENCE_LEVEL_WEIGHT: Record<GymEvidenceClaim['evidenceLevel'], number> = {
  meta_analysis: 1,
  systematic_review: 0.9,
  rct: 0.75,
  guideline: 0.7,
  expert_consensus: 0.65,
}

export function rankClaimsForContext(
  claims: GymEvidenceClaim[],
  ctx: PrescriptionContext,
): { claim: GymEvidenceClaim; applicability: ApplicabilityResult }[] {
  const trainingGoal = mapGymGoalToTrainingGoal(ctx.goal)

  return claims
    .map(claim => {
      const applicability = scoreApplicability(claim, ctx, trainingGoal)
      const evidenceWeight = EVIDENCE_LEVEL_WEIGHT[claim.evidenceLevel] ?? 0.5
      const combined = applicability.score * evidenceWeight
      return { claim, applicability, combined }
    })
    .sort((a, b) => b.combined - a.combined)
    .map(({ claim, applicability }) => ({ claim, applicability }))
}

function scoreApplicability(
  claim: GymEvidenceClaim,
  ctx: PrescriptionContext,
  trainingGoal: ReturnType<typeof mapGymGoalToTrainingGoal>,
): ApplicabilityResult {
  const reasons: string[] = []
  const warnings: string[] = []
  let score = 0.5

  if (claim.goals.includes(trainingGoal)) {
    score += 0.2
    reasons.push(`Matches ${trainingGoal} goal`)
  }

  const pop = ctx.experience === 'beginner'
    ? 'beginners'
    : ctx.experience === 'advanced'
      ? 'advanced_lifters'
      : 'intermediate_lifters'

  if (claim.populations.includes(pop) || claim.populations.includes('general_adults')) {
    score += 0.15
    reasons.push(`Applies to ${pop}`)
  }

  if (claim.muscles?.length && claim.muscles.includes(ctx.muscle)) {
    score += 0.1
    reasons.push(`Targets ${ctx.muscle}`)
  }

  const source = getResearchSource(claim.sourceId)
  if (!source || source.status !== 'approved') {
    score = 0
    warnings.push('Source is not approved for prescriptions')
    return { claimId: claim.id, applicable: false, score: 0, reasons, warnings }
  }

  if (isSourceOutdated(source)) {
    score *= 0.5
    warnings.push('Source review is overdue or marked outdated')
  }

  return {
    claimId: claim.id,
    applicable: score >= 0.45,
    score: Math.min(1, score),
    reasons,
    warnings,
  }
}
