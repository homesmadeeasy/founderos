import type { GymInput, GymEvidence, GymSnapshot, TrainingBlock, TechniqueReview, VideoAnalysis, MovementAnalysis } from './gymTypes'
import { gatherGymData, inferGoalProfile, inferEquipmentProfile, inferInjuryProfile, startOfWeekISO } from './gymUtils'
import { parseWorkoutSessions } from './gymWorkoutLogger'
import { computeWeeklyVolume, volumeScoreFromWeekly } from './gymVolume'
import { assessRecovery, recoveryScoreFromAssessment } from './gymRecovery'
import { computeStrengthEstimates, progressionScoreFromEstimates } from './gymProgression'
import { detectWeaknesses } from './gymWeaknessDetection'
import { recommendExercises } from './gymExerciseSelection'
import { generateTodaysWorkout } from './gymWorkoutPlanner'
import { generateGymNarrative } from './gymNarrative'
import { GYM_GOAL_LABELS } from './gymTypes'
import { extractHealthTextFromInput } from './evidence/gymPrescriptionContext'

function buildGymEvidence(input: GymInput, data: ReturnType<typeof gatherGymData>): GymEvidence[] {
  const evidence: GymEvidence[] = []

  const healthEval = input.domainIntelligence?.evaluations.find(e => e.domainId === 'health')
  if (healthEval) {
    evidence.push({
      id: `ev-domain-${healthEval.id}`,
      sourceType: 'domain',
      title: `Health domain (${healthEval.score})`,
      summary: healthEval.recommendation,
      weight: 0.85,
      supports: healthEval.score >= 55,
    })
  }

  const health = input.healthSignals ?? input.dailyContext?.healthSignals
  if (health) {
    evidence.push({
      id: 'ev-health-signals',
      sourceType: 'health',
      title: 'Health signals',
      summary: health.summary || `Sleep ${health.sleepHours ?? '—'}h · Workout ${health.workoutCompleted ? 'done' : 'open'}`,
      weight: 0.9,
      supports: (health.sleepHours ?? 7) >= 6.5,
    })
  }

  for (const sig of data.workoutSignals.slice(0, 3)) {
    evidence.push({
      id: `ev-sig-${sig.id}`,
      sourceType: 'signal',
      title: sig.title,
      summary: sig.content.slice(0, 120),
      weight: 0.7,
      supports: !/not logged|gap|missed/i.test(sig.content),
    })
  }

  for (const mem of data.healthLogs.slice(0, 3)) {
    evidence.push({
      id: `ev-mem-${mem.id}`,
      sourceType: 'memory',
      title: mem.title,
      summary: mem.content.slice(0, 120),
      weight: 0.75,
      supports: /completed|workout/i.test(mem.content),
    })
  }

  for (const obj of data.workoutObjects.slice(0, 3)) {
    evidence.push({
      id: `ev-obj-${obj.id}`,
      sourceType: 'object',
      title: obj.title,
      summary: (obj.summary ?? obj.content ?? 'Workout object').slice(0, 120),
      weight: 0.8,
      supports: obj.status === 'completed',
    })
  }

  for (const k of data.gymKnowledge.slice(0, 2)) {
    evidence.push({
      id: `ev-know-${k.id}`,
      sourceType: 'knowledge',
      title: k.title,
      summary: k.principle.slice(0, 100),
      weight: 0.6,
      supports: true,
    })
  }

  const workoutDecision = input.decisionOutput?.primaryDecision?.area === 'health'
    ? input.decisionOutput.primaryDecision
    : input.decisionOutput?.secondaryDecisions?.find(c => c.area === 'health')
  if (workoutDecision) {
    evidence.push({
      id: `ev-dec-${workoutDecision.id}`,
      sourceType: 'decision',
      title: workoutDecision.title,
      summary: workoutDecision.reason?.slice(0, 100) ?? '',
      weight: 0.65,
      supports: true,
    })
  }

  return evidence.slice(0, 10)
}

function buildTrainingBlock(goal: ReturnType<typeof inferGoalProfile>): TrainingBlock {
  return {
    id: 'block-current',
    name: `${GYM_GOAL_LABELS[goal.primaryGoal]} block`,
    goal: goal.primaryGoal,
    weeksRemaining: 4,
    focus: goal.primaryGoal === 'muscle_growth'
      ? 'Hypertrophy volume with controlled RPE'
      : goal.primaryGoal === 'strength'
        ? 'Heavy compounds and rep quality'
        : 'Consistent full-body stimulus',
  }
}

function buildTopRecommendation(
  recovery: ReturnType<typeof assessRecovery>,
  workout: ReturnType<typeof generateTodaysWorkout>,
  hasHistory: boolean,
): string {
  if (recovery.status === 'deload') {
    return 'Run today\'s deload session — cut volume, protect sleep, and log how you feel.'
  }
  if (recovery.status === 'recover') {
    return 'Prioritise sleep and mobility today. Skip heavy compounds unless energy rebounds.'
  }
  if (!hasHistory) {
    return `Start with ${workout.title} and log every set so Gym AI can track volume and progression.`
  }
  return `Execute ${workout.title} — ${workout.exercises.length} exercises, ~${workout.estimatedMinutes} minutes.`
}

function buildMainInsight(
  recovery: ReturnType<typeof assessRecovery>,
  sessionsThisWeek: number,
  hasHistory: boolean,
): string {
  if (!hasHistory) {
    return 'No structured workout history detected — recommendations use health signals and gym knowledge only.'
  }
  if (recovery.status === 'deload') {
    return 'Fatigue and recovery signals are elevated — a deload will protect long-term progression.'
  }
  if (sessionsThisWeek === 0) {
    return 'No sessions logged this week yet — consistency is the biggest lever right now.'
  }
  return `${sessionsThisWeek} session(s) this week with ${recovery.status.replace('_', ' ')} recovery readiness.`
}

function buildPlaceholders(): {
  techniqueReviews: TechniqueReview[]
  videoAnalysis: VideoAnalysis[]
  movementAnalysis: MovementAnalysis[]
} {
  return {
    techniqueReviews: [{
      id: 'tech-placeholder',
      exerciseId: 'barbell-squat',
      status: 'placeholder',
      notes: 'Technique review available in Gym Vision V2.',
    }],
    videoAnalysis: [{
      id: 'video-placeholder',
      exerciseId: 'barbell-bench-press',
      status: 'placeholder',
      summary: 'Video analysis placeholder — Gym Vision V2.',
    }],
    movementAnalysis: [{
      id: 'move-placeholder',
      exerciseId: 'barbell-squat',
      status: 'placeholder',
      findings: ['Movement analysis reserved for Gym Vision V2.'],
    }],
  }
}

export function buildGymSnapshot(input: GymInput): GymSnapshot {
  const data = gatherGymData(input)
  const sessions = parseWorkoutSessions(input)
  const hasWorkoutHistory = sessions.some(s => s.exercises.some(e => e.sets.length > 0))
  const weekStart = startOfWeekISO()
  const sessionsThisWeek = sessions.filter(s => s.date >= weekStart).length

  const goalProfile = inferGoalProfile(data, input)
  const equipmentProfile = inferEquipmentProfile(data)
  const injuryProfile = inferInjuryProfile(data)

  const recoveryAssessment = assessRecovery(input, sessions)
  const weeklyVolume = computeWeeklyVolume(sessions, recoveryAssessment.status === 'recover' ? ['quads', 'back'] : [])
  const strengthEstimates = computeStrengthEstimates(sessions)
  const weaknesses = detectWeaknesses(weeklyVolume, sessions, goalProfile)
  const evidence = buildGymEvidence(input, data)
  const evidenceIds = evidence.map(e => e.id)

  const healthText = extractHealthTextFromInput(input)
  const todaysWorkout = generateTodaysWorkout({
    goal: goalProfile,
    recovery: recoveryAssessment.status,
    sessions,
    volume: weeklyVolume,
    weaknesses,
    equipment: equipmentProfile,
    injuries: injuryProfile,
    evidenceIds,
    healthText,
    shortSession: false,
  })

  const recommendations = recommendExercises({
    goal: goalProfile,
    equipment: equipmentProfile,
    injuries: injuryProfile,
    volume: weeklyVolume,
    weaknesses,
  })

  const volumeScore = volumeScoreFromWeekly(weeklyVolume)
  const progressionScore = progressionScoreFromEstimates(strengthEstimates)
  const recoveryScore = recoveryScoreFromAssessment(recoveryAssessment)
  const consistencyScore = Math.min(95, 35 + sessionsThisWeek * 15 + (hasWorkoutHistory ? 10 : 0))
  const momentumScore = Math.round(
    volumeScore * 0.25 + progressionScore * 0.25 + recoveryScore * 0.25 + consistencyScore * 0.25,
  )

  const placeholders = buildPlaceholders()

  const partial: GymSnapshot = {
    momentumScore,
    consistencyScore,
    recoveryScore,
    volumeScore,
    progressionScore,
    mainInsight: buildMainInsight(recoveryAssessment, sessionsThisWeek, hasWorkoutHistory),
    topRecommendation: buildTopRecommendation(recoveryAssessment, todaysWorkout, hasWorkoutHistory),
    recoveryStatus: recoveryAssessment.status,
    todaysWorkout,
    weeklyVolume,
    strengthEstimates,
    weaknesses,
    recommendations,
    recentSessions: sessions.slice(0, 8),
    goalProfile,
    equipmentProfile,
    injuryProfile,
    trainingBlock: buildTrainingBlock(goalProfile),
    evidence,
    narrative: '',
    hasWorkoutHistory,
    sessionsThisWeek,
    ...placeholders,
  }

  partial.narrative = generateGymNarrative(partial)

  return partial
}

export function getGymInsightOneLiner(snapshot: GymSnapshot): string {
  return snapshot.mainInsight
}
