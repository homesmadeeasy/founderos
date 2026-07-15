import type { Exercise } from '../gymTypes'
import type {
  PrescriptionContext,
  PrescriptionRationale,
  WorkoutExercisePrescription,
  WorkoutResearchSummary,
} from './gymEvidenceTypes'
import { claimsForVariable } from './gymEvidenceClaims'
import { getEvidenceClaim } from './gymEvidenceRegistry'
import { rankClaimsForContext } from './gymEvidenceRanking'
import { citationsFromClaimIds } from './gymEvidenceCitations'
import { clamp, midpoint, parseRepRange, stablePrescriptionKey } from './gymEvidenceUtils'
import { mapGymGoalToTrainingGoal } from './gymEvidenceClaims'

export interface TrainingDose {
  sets: number
  repRange: string
  targetReps: number
  targetRPE: number
  targetRIR?: number
  restSeconds: number
  researchClaimIds: string[]
  assumptions: string[]
  contraindicationFlags: string[]
}

export function selectTrainingDose(
  exercise: Exercise,
  ctx: PrescriptionContext,
  light: boolean,
): TrainingDose {
  const trainingGoal = mapGymGoalToTrainingGoal(ctx.goal)
  const assumptions: string[] = []
  const contraindicationFlags: string[] = []
  const researchClaimIds: string[] = []

  const repClaims = rankClaimsForContext(claimsForVariable('rep_range', trainingGoal), ctx)
  const setClaims = rankClaimsForContext(
    claimsForVariable('sets_per_exercise', trainingGoal),
    ctx,
  )
  const restClaims = rankClaimsForContext(claimsForVariable('rest_interval', trainingGoal), ctx)
  const rpeClaims = rankClaimsForContext(claimsForVariable('rpe', trainingGoal), ctx)
  const rirClaims = rankClaimsForContext(claimsForVariable('proximity_to_failure', trainingGoal), ctx)

  for (const ranked of [repClaims[0], setClaims[0], restClaims[0], rpeClaims[0], rirClaims[0]]) {
    if (ranked?.applicability.applicable) researchClaimIds.push(ranked.claim.id)
  }

  let sets = 3
  if (setClaims[0]?.applicability.applicable && setClaims[0].claim.valueRange) {
    const { min = 2, max = 4 } = setClaims[0].claim.valueRange
    sets = ctx.experience === 'beginner' ? min : midpoint(min, max)
  } else if (ctx.experience === 'beginner') {
    sets = 2
    assumptions.push('Using conservative set count — limited approved set guidance for context')
  }

  if (exercise.compound && ctx.experience !== 'beginner') sets = Math.max(sets, 3)
  if (!exercise.compound) sets = Math.min(sets, 3)

  if (ctx.weeklyMuscleSets >= 16) {
    sets = Math.max(2, sets - 1)
    assumptions.push(`Reduced sets because ${ctx.muscle} weekly volume is already elevated (${ctx.weeklyMuscleSets} sets)`)
  }
  if (light || ctx.recoveryStatus === 'train_light' || ctx.recoveryStatus === 'deload') {
    sets = Math.max(2, sets - 1)
    assumptions.push('Reduced volume for light recovery or deload status')
  }
  if (ctx.shortSession) {
    sets = Math.max(2, sets - 1)
    assumptions.push('Reduced sets to fit shorter available session time')
  }

  const libraryRange = parseRepRange(exercise.repRange)
  let repMin = libraryRange.min
  let repMax = libraryRange.max

  if (ctx.goal === 'strength' || ctx.goal === 'powerlifting') {
    if (repClaims.find(r => r.claim.id === 'claim-acsm-strength-reps')?.applicability.applicable) {
      repMin = 3
      repMax = 6
    } else {
      repMin = 4
      repMax = 6
    }
  } else if (ctx.goal === 'muscle_growth' || ctx.goal === 'general_fitness') {
    if (repClaims.find(r => r.claim.id === 'claim-acsm-hypertrophy-reps')?.applicability.applicable) {
      repMin = 8
      repMax = 12
    }
  } else if (ctx.goal === 'weight_loss') {
    repMin = 8
    repMax = 12
    assumptions.push('Maintaining resistance-training quality with moderate rep ranges for weight-management goals')
  }

  if (ctx.experience === 'beginner') {
    repMin = Math.max(repMin, 8)
    repMax = Math.max(repMax, 10)
    assumptions.push('Beginner-focused rep range prioritises technique and manageable fatigue')
  }

  let targetReps = midpoint(repMin, repMax)
  if (ctx.goal === 'strength' || ctx.goal === 'powerlifting') {
    targetReps = exercise.compound ? 5 : 6
  }

  let targetRPE = 7
  if (rpeClaims[0]?.applicability.applicable && rpeClaims[0].claim.valueRange) {
    const { min = 6, max = 8 } = rpeClaims[0].claim.valueRange
    targetRPE = midpoint(min, max)
  }
  if (ctx.goal === 'strength' || ctx.goal === 'powerlifting') targetRPE = 8
  if (light || ctx.recoveryStatus === 'train_light' || ctx.recoveryStatus === 'deload') targetRPE = 6
  if (ctx.experience === 'beginner' && !ctx.hasWorkoutHistory) targetRPE = 6

  let restSeconds = exercise.restSeconds
  if (restClaims[0]?.applicability.applicable && restClaims[0].claim.valueRange) {
    const { min = 120, max = 180 } = restClaims[0].claim.valueRange
    restSeconds = exercise.compound ? max : midpoint(min, max)
  }
  if (light) restSeconds = Math.round(restSeconds * 0.75)

  if (ctx.painFlags.length > 0 || ctx.injuryAreas.length > 0) {
    targetRPE = Math.min(targetRPE, 6)
    sets = Math.max(2, sets - 1)
    contraindicationFlags.push(...ctx.painFlags, ...ctx.injuryAreas.map(a => `injury:${a}`))
    assumptions.push('Conservative dose due to reported pain or injury flags — not a medical diagnosis')
  }

  if (ctx.sorenessFlag) {
    targetRPE = Math.min(targetRPE, 7)
    assumptions.push('Slightly reduced effort target due to soreness signals')
  }

  return {
    sets: clamp(sets, ctx.experience === 'beginner' ? 2 : 1, 5),
    repRange: `${repMin}-${repMax}`,
    targetReps,
    targetRPE: clamp(targetRPE, 5, 9),
    targetRIR: targetRPE >= 8 ? 1 : 2,
    restSeconds,
    researchClaimIds: [...new Set(researchClaimIds)],
    assumptions,
    contraindicationFlags,
  }
}

export function calculatePrescriptionConfidence(
  ctx: PrescriptionContext,
  dose: TrainingDose,
): number {
  let confidence = 45
  if (dose.researchClaimIds.length > 0) confidence += 20
  if (dose.researchClaimIds.length >= 3) confidence += 10
  if (ctx.hasWorkoutHistory) confidence += 12
  if (ctx.recentReps != null || ctx.recentWeight != null) confidence += 8
  if (ctx.estimated1RM != null) confidence += 5
  if (ctx.sleepHours != null) confidence += 3
  if (!ctx.hasWorkoutHistory) confidence -= 10
  if (ctx.experience === 'beginner') confidence -= 3
  if (ctx.painFlags.length > 0) confidence -= 8
  if (ctx.equipmentLimited) confidence -= 4
  if (dose.researchClaimIds.length === 0) confidence = Math.min(confidence, 40)
  return clamp(confidence, 15, 92)
}

export function validatePrescriptionSafety(
  ctx: PrescriptionContext,
  dose: TrainingDose,
): { safe: boolean; safetyNotes: string[] } {
  const safetyNotes: string[] = []
  if (ctx.painFlags.length > 0) {
    safetyNotes.push('Pain reported — using conservative loading. Consider assessment by a qualified health professional if pain persists.')
  }
  if (ctx.injuryAreas.includes('shoulder') && ctx.muscle === 'chest') {
    safetyNotes.push('Shoulder flag present — prioritise controlled range and warm-up sets for pressing movements.')
  }
  if (ctx.injuryAreas.includes('knee') && ctx.muscle === 'quads') {
    safetyNotes.push('Knee flag present — avoid forcing depth or load beyond comfortable range.')
  }
  if (ctx.recoveryStatus === 'recover') {
    safetyNotes.push('Recovery signals suggest prioritising rest over maximal effort today.')
  }
  return { safe: true, safetyNotes }
}

export function explainPrescription(
  exercise: Exercise,
  ctx: PrescriptionContext,
  dose: TrainingDose,
  confidence: number,
  mode: WorkoutExercisePrescription['prescriptionMode'],
): PrescriptionRationale {
  const missing: string[] = []
  if (!ctx.hasWorkoutHistory) missing.push('structured workout history')
  if (ctx.recentWeight == null) missing.push('recent working weights for this exercise')
  if (ctx.estimated1RM == null) missing.push('estimated 1RM')
  if (ctx.sleepHours == null) missing.push('recent sleep data')

  const citations = citationsFromClaimIds(dose.researchClaimIds, claimId => getEvidenceClaim(claimId)?.sourceId)

  let personalReason = ''
  if (ctx.goal === 'muscle_growth') {
    personalReason = `Hypertrophy goal with ${ctx.experience} experience and ${ctx.weeklyMuscleSets} weekly sets logged for ${ctx.muscle}.`
  } else if (ctx.goal === 'strength' || ctx.goal === 'powerlifting') {
    personalReason = `Strength-focused goal — lower repetitions with higher effort targets where recovery allows.`
  } else if (ctx.goal === 'weight_loss') {
    personalReason = `Weight-management goal — maintaining quality resistance training without defaulting to high-rep circuits.`
  } else {
    personalReason = `General fitness goal with ${ctx.experience} experience and current recovery status: ${ctx.recoveryStatus}.`
  }

  if (ctx.weeklyMuscleSets >= 16) {
    personalReason += ` Weekly ${ctx.muscle} volume is high, so set count was moderated.`
  }
  if (!ctx.hasWorkoutHistory) {
    personalReason += ' No structured history yet — this is a conservative starting point.'
  }

  let researchBasis = ''
  if (mode === 'fallback' || dose.researchClaimIds.length === 0) {
    researchBasis = 'Limited approved research matched this exact context. Prescription uses conservative library fallbacks and general training principles.'
  } else {
    const claimSummaries = dose.researchClaimIds
      .map(id => getEvidenceClaim(id)?.claim)
      .filter(Boolean)
      .slice(0, 3)
    researchBasis = claimSummaries.join(' ')
  }

  const progressionRule = ctx.hasWorkoutHistory
    ? 'Add load or reps when all prescribed sets are completed at target effort for two consecutive sessions.'
    : 'Establish consistent technique and log all sets for two weeks before pushing load aggressively.'

  const deloadRule = 'If recovery remains poor for 5–7 days or performance drops across multiple sessions, reduce sets by 30–40% for one week.'

  return {
    personalReason,
    researchBasis,
    assumptions: dose.assumptions,
    confidence,
    progressionRule,
    deloadRule,
    citations,
    missingDataForPersonalisation: missing,
    safetyNotes: validatePrescriptionSafety(ctx, dose).safetyNotes,
  }
}

export function buildExercisePrescription(
  exercise: Exercise,
  ctx: PrescriptionContext,
  light: boolean,
): WorkoutExercisePrescription {
  const dose = selectTrainingDose(exercise, ctx, light)
  const confidence = calculatePrescriptionConfidence(ctx, dose)
  const mode: WorkoutExercisePrescription['prescriptionMode'] =
    dose.researchClaimIds.length > 0 && confidence >= 50 ? 'evidence_informed' : 'fallback'

  const explanation = explainPrescription(exercise, ctx, dose, confidence, mode)

  const rationale = mode === 'evidence_informed'
    ? `Recommended starting point: ${dose.sets}×${dose.targetReps} (range ${dose.repRange}) at RPE ${dose.targetRPE}, based on current evidence and your available data.`
    : `Fallback prescription: ${dose.sets}×${dose.targetReps} at RPE ${dose.targetRPE} — conservative baseline due to limited personal history or matching research.`

  return {
    exerciseId: exercise.id,
    sets: dose.sets,
    repRange: dose.repRange,
    targetReps: dose.targetReps,
    targetRPE: dose.targetRPE,
    targetRIR: dose.targetRIR,
    restSeconds: dose.restSeconds,
    estimatedLoadMethod: ctx.estimated1RM ? 'percentage_1rm' : 'rpe_based',
    progressionRule: explanation.progressionRule,
    deloadRule: explanation.deloadRule,
    goal: ctx.goal,
    prescriptionConfidence: confidence,
    prescriptionMode: mode,
    researchClaimIds: dose.researchClaimIds,
    userEvidenceIds: ctx.userEvidenceIds,
    assumptions: dose.assumptions,
    contraindicationFlags: dose.contraindicationFlags,
    rationale,
    explanation,
  }
}

export function buildWorkoutResearchSummary(
  prescriptions: WorkoutExercisePrescription[],
): WorkoutResearchSummary {
  const approvedSourceIds = new Set<string>()
  for (const p of prescriptions) {
    for (const claimId of p.researchClaimIds) {
      const sourceId = getEvidenceClaim(claimId)?.sourceId
      if (sourceId) approvedSourceIds.add(sourceId)
    }
  }
  const avg = prescriptions.length
    ? Math.round(prescriptions.reduce((s, p) => s + p.prescriptionConfidence, 0) / prescriptions.length)
    : 0

  return {
    methodology: 'Each exercise prescription combines approved research claims ranked for your goal, experience, recovery, and logged training data. Missing data lowers confidence; fallback rules apply when no approved claim matches.',
    approvedSourceIds: [...approvedSourceIds],
    averageConfidence: avg,
    evidenceInformedCount: prescriptions.filter(p => p.prescriptionMode === 'evidence_informed').length,
    fallbackCount: prescriptions.filter(p => p.prescriptionMode === 'fallback').length,
    reviewedAt: new Date().toISOString(),
  }
}

export function prescriptionCacheKey(exerciseId: string, ctx: PrescriptionContext, light: boolean): string {
  return stablePrescriptionKey([
    exerciseId,
    ctx.goal,
    ctx.experience,
    ctx.hasWorkoutHistory,
    ctx.recoveryStatus,
    ctx.weeklyMuscleSets,
    ctx.muscle,
    ctx.injuryAreas.join(','),
    ctx.painFlags.join(','),
    light,
    ctx.shortSession,
  ])
}
