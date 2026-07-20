import type {
  TodaysWorkout,
  PlannedExercise,
  GoalProfile,
  RecoveryStatus,
  MuscleGroup,
  WorkoutSession,
} from './gymTypes'
import type { WeeklyVolume } from './gymTypes'
import type { GymWeakness } from './gymTypes'
import type { EquipmentProfile, InjuryProfile } from './gymTypes'
import { GYM_EXERCISE_LIBRARY } from './gymExerciseLibrary'
import { recommendExercises } from './gymExerciseSelection'
import { buildExercisePrescription, buildWorkoutResearchSummary } from './evidence/gymPrescriptionReasoning'
import { buildPrescriptionContext } from './evidence/gymPrescriptionContext'
import {
  normalizeExerciseId,
  finalizeTodaysWorkout,
} from './gymPlannedExerciseUtils'

const SPLIT_TEMPLATES: Record<string, string[]> = {
  push: ['barbell-bench-press', 'incline-dumbbell-press', 'overhead-press', 'lateral-raise', 'tricep-pushdown'],
  pull: ['barbell-row', 'lat-pulldown', 'face-pull', 'barbell-curl'],
  legs: ['barbell-squat', 'romanian-deadlift', 'leg-press', 'calf-raise'],
  upper: ['barbell-bench-press', 'barbell-row', 'overhead-press', 'barbell-curl'],
  full: ['barbell-squat', 'barbell-bench-press', 'barbell-row', 'hanging-leg-raise'],
  light: ['lat-pulldown', 'leg-press', 'dumbbell-shoulder-press', 'face-pull'],
  deload: ['leg-press', 'lat-pulldown', 'dumbbell-shoulder-press'],
}

function pickSplit(
  recovery: RecoveryStatus,
  sessions: WorkoutSession[],
  goal: GoalProfile,
): string {
  if (recovery === 'deload' || recovery === 'recover') return 'deload'
  if (recovery === 'train_light') return 'light'

  const recentTitles = sessions.slice(0, 3).map(s => s.title.toLowerCase()).join(' ')
  if (/push|chest|press/i.test(recentTitles) && !/pull|back/i.test(recentTitles)) return 'pull'
  if (/pull|back/i.test(recentTitles) && !/leg|squat/i.test(recentTitles)) return 'legs'
  if (/leg|squat/i.test(recentTitles)) return 'push'

  if (goal.primaryGoal === 'powerlifting') return 'full'
  const day = new Date().getDay()
  if (day % 3 === 0) return 'push'
  if (day % 3 === 1) return 'pull'
  return 'legs'
}

function buildPlannedExercise(
  exerciseId: string,
  order: number,
  params: {
    goal: GoalProfile
    recovery: RecoveryStatus
    sessions: WorkoutSession[]
    volume: WeeklyVolume[]
    injuries: InjuryProfile
    equipment: EquipmentProfile
    userEvidenceIds: string[]
    healthText: string
    shortSession: boolean
  },
): Omit<PlannedExercise, 'plannedExerciseId'> | null {
  const ex = GYM_EXERCISE_LIBRARY.find(e => e.id === exerciseId)
  if (!ex) return null

  const light = params.recovery === 'train_light' || params.recovery === 'deload'
  const ctx = buildPrescriptionContext({
    exercise: ex,
    goal: params.goal,
    recovery: params.recovery,
    sessions: params.sessions,
    volume: params.volume,
    injuries: params.injuries,
    equipment: params.equipment,
    userEvidenceIds: params.userEvidenceIds,
    shortSession: params.shortSession,
    healthText: params.healthText,
  })

  const prescription = buildExercisePrescription(ex, ctx, light)

  return {
    exerciseId: ex.id,
    exerciseName: ex.name,
    order,
    sets: prescription.sets,
    reps: String(prescription.targetReps),
    restSeconds: prescription.restSeconds,
    targetRpe: prescription.targetRPE ?? 7,
    primaryMuscle: ex.primaryMuscle,
    prescription,
  }
}

/** Build exercise ID list without accidental duplicates (tracks selected canonical IDs). */
export function buildUniqueExerciseIdList(params: {
  splitKey: string
  goal: GoalProfile
  equipment: EquipmentProfile
  injuries: InjuryProfile
  volume: WeeklyVolume[]
  weaknesses: GymWeakness[]
  maxExercises: number
}): string[] {
  let exerciseIds = [...(SPLIT_TEMPLATES[params.splitKey] ?? SPLIT_TEMPLATES.full)]

  if (params.injuries.areas.includes('knee')) {
    exerciseIds = exerciseIds.filter(id => id !== 'barbell-squat')
  }
  if (!params.equipment.available.includes('barbell')) {
    exerciseIds = exerciseIds.map(id =>
      id === 'barbell-squat' ? 'leg-press'
      : id === 'barbell-bench-press' ? 'incline-dumbbell-press'
      : id === 'barbell-row' ? 'lat-pulldown'
      : id,
    )
  }

  // Canonical-dedupe template + substitution collisions (e.g. bench→incline when barbell missing).
  const selected = new Set<string>()
  const unique: string[] = []
  for (const id of exerciseIds) {
    const canonical = normalizeExerciseId(id)
    if (selected.has(canonical)) continue
    selected.add(canonical)
    unique.push(id)
  }

  const recs = recommendExercises({
    goal: params.goal,
    equipment: params.equipment,
    injuries: params.injuries,
    volume: params.volume,
    weaknesses: params.weaknesses,
    excludeIds: unique,
  })

  for (const rec of recs) {
    if (unique.length >= params.maxExercises) break
    const canonical = normalizeExerciseId(rec.exerciseId)
    if (selected.has(canonical)) continue
    selected.add(canonical)
    unique.push(rec.exerciseId)
  }

  return unique.slice(0, params.maxExercises)
}

export function generateTodaysWorkout(params: {
  goal: GoalProfile
  recovery: RecoveryStatus
  sessions: WorkoutSession[]
  volume: WeeklyVolume[]
  weaknesses: GymWeakness[]
  equipment: EquipmentProfile
  injuries: InjuryProfile
  evidenceIds: string[]
  healthText?: string
  shortSession?: boolean
}): TodaysWorkout {
  const splitKey = pickSplit(params.recovery, params.sessions, params.goal)
  const light = params.recovery === 'train_light' || params.recovery === 'deload'
  const maxExercises = light ? 4 : 6

  const exerciseIds = buildUniqueExerciseIdList({
    splitKey,
    goal: params.goal,
    equipment: params.equipment,
    injuries: params.injuries,
    volume: params.volume,
    weaknesses: params.weaknesses,
    maxExercises,
  })

  const planParams = {
    goal: params.goal,
    recovery: params.recovery,
    sessions: params.sessions,
    volume: params.volume,
    injuries: params.injuries,
    equipment: params.equipment,
    userEvidenceIds: params.evidenceIds,
    healthText: params.healthText ?? '',
    shortSession: params.shortSession ?? false,
  }

  const rawExercises = exerciseIds
    .map((id, i) => buildPlannedExercise(id, i + 1, planParams))
    .filter((e): e is Omit<PlannedExercise, 'plannedExerciseId'> => e != null)
    .map(e => ({ ...e, plannedExerciseId: '' }))

  const muscles = [...new Set(rawExercises.map(e => e.primaryMuscle))] as MuscleGroup[]
  const estimatedMinutes = rawExercises.reduce((sum, e) => sum + e.sets * (e.restSeconds / 60 + 0.75), 0)
  const researchSummary = buildWorkoutResearchSummary(rawExercises.map(e => e.prescription))

  const title = splitKey === 'deload'
    ? 'Deload session'
    : splitKey === 'light'
      ? 'Light training day'
      : `${splitKey.charAt(0).toUpperCase()}${splitKey.slice(1)} day`

  const rationale = params.sessions.length === 0
    ? 'Evidence-informed starter session from your goal, recovery signals, and approved research — confidence is limited until you log workouts.'
    : `Built from ${params.sessions.length} logged session(s), weekly volume, recovery status, and approved research claims (${researchSummary.evidenceInformedCount} evidence-informed, ${researchSummary.fallbackCount} fallback).`

  return finalizeTodaysWorkout({
    title,
    exercises: rawExercises,
    estimatedMinutes: Math.round(estimatedMinutes),
    musclesTrained: muscles,
    rationale,
    evidenceIds: params.evidenceIds,
    researchSummary,
  })
}

export function buildPushPullLegsRoutine(goal: GoalProfile): { name: string; days: string[] } {
  return {
    name: 'Push / Pull / Legs',
    days: [
      `Push — ${SPLIT_TEMPLATES.push.map(id => GYM_EXERCISE_LIBRARY.find(e => e.id === id)?.name).filter(Boolean).join(', ')}`,
      `Pull — ${SPLIT_TEMPLATES.pull.map(id => GYM_EXERCISE_LIBRARY.find(e => e.id === id)?.name).filter(Boolean).join(', ')}`,
      `Legs — ${SPLIT_TEMPLATES.legs.map(id => GYM_EXERCISE_LIBRARY.find(e => e.id === id)?.name).filter(Boolean).join(', ')}`,
    ],
  }
}

export { SPLIT_TEMPLATES }
