import type {
  TodaysWorkout,
  PlannedExercise,
  GoalProfile,
  RecoveryStatus,
  MuscleGroup,
  GymGoal,
} from './gymTypes'
import type { WorkoutSession } from './gymTypes'
import { GYM_EXERCISE_LIBRARY } from './gymExerciseLibrary'
import { recommendExercises } from './gymExerciseSelection'
import type { WeeklyVolume } from './gymTypes'
import type { GymWeakness } from './gymTypes'
import type { EquipmentProfile, InjuryProfile } from './gymTypes'

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

function buildPlannedExercise(exerciseId: string, order: number, goal: GymGoal, light: boolean): PlannedExercise | null {
  const ex = GYM_EXERCISE_LIBRARY.find(e => e.id === exerciseId)
  if (!ex) return null
  const sets = light ? 2 : ex.compound ? 3 : 3
  const reps = goal === 'strength' || goal === 'powerlifting'
    ? (ex.compound ? '5' : '8')
    : ex.repRange.split('-')[0] ?? '8'
  return {
    exerciseId: ex.id,
    exerciseName: ex.name,
    order,
    sets,
    reps,
    restSeconds: light ? Math.round(ex.restSeconds * 0.75) : ex.restSeconds,
    targetRpe: light ? 6 : goal === 'strength' ? 8 : 7,
    primaryMuscle: ex.primaryMuscle,
  }
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
}): TodaysWorkout {
  const splitKey = pickSplit(params.recovery, params.sessions, params.goal)
  let exerciseIds = [...(SPLIT_TEMPLATES[splitKey] ?? SPLIT_TEMPLATES.full)]

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

  const recs = recommendExercises({
    goal: params.goal,
    equipment: params.equipment,
    injuries: params.injuries,
    volume: params.volume,
    weaknesses: params.weaknesses,
    excludeIds: exerciseIds,
  })
  if (recs[0] && exerciseIds.length < 6) {
    exerciseIds.push(recs[0].exerciseId)
  }

  const light = params.recovery === 'train_light' || params.recovery === 'deload'
  const exercises = exerciseIds
    .map((id, i) => buildPlannedExercise(id, i + 1, params.goal.primaryGoal, light))
    .filter((e): e is PlannedExercise => e != null)
    .slice(0, light ? 4 : 6)

  const muscles = [...new Set(exercises.map(e => e.primaryMuscle))] as MuscleGroup[]
  const estimatedMinutes = exercises.reduce((sum, e) => sum + e.sets * (e.restSeconds / 60 + 0.75), 0)

  const title = splitKey === 'deload'
    ? 'Deload session'
    : splitKey === 'light'
      ? 'Light training day'
      : `${splitKey.charAt(0).toUpperCase()}${splitKey.slice(1)} day`

  const rationale = params.sessions.length === 0
    ? 'No logged workout history — starter session from your goal and recovery signals.'
    : `Built from ${params.sessions.length} logged session(s), weekly volume, and ${params.recovery} recovery status.`

  return {
    title,
    exercises,
    estimatedMinutes: Math.round(estimatedMinutes),
    musclesTrained: muscles,
    rationale,
    evidenceIds: params.evidenceIds,
  }
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
