import type { MuscleGroup } from '../gymTypes'
import { getExerciseById } from '../gymExerciseLibrary'
import type { ExercisePerformanceRecord } from './gymStorageTypes'
import type { MuscleVolumeBreakdown, VolumeDataStatus } from './gymStorageTypes'
import type { WorkoutSessionRecord } from './gymStorageTypes'
import { startOfWeekISO } from '../gymUtils'
import { filterCompletedSessionRecords, isCompletedWorkoutSession } from '../gymSessionStatus'

/** Primary muscle gets 1.0 per working set; secondary muscles get fixed fractional credit. */
export const SECONDARY_MUSCLE_WEIGHT = 0.5

export function muscleContributionForExercise(exerciseId: string): {
  primary: MuscleGroup
  secondary: { muscle: MuscleGroup; weight: number }[]
} | null {
  const ex = getExerciseById(exerciseId)
  if (!ex) return null
  return {
    primary: ex.primaryMuscle,
    secondary: ex.secondaryMuscles.map(m => ({ muscle: m, weight: SECONDARY_MUSCLE_WEIGHT })),
  }
}

export function countWorkingSets(exercises: ExercisePerformanceRecord[]): number {
  return exercises.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.completed && s.setType === 'working').length, 0)
}

export function computeMuscleVolumeFromSessions(
  sessions: WorkoutSessionRecord[],
  hasFullWeek: boolean,
): MuscleVolumeBreakdown[] {
  const weekStart = startOfWeekISO()
  // Planned / Skipped / Cancelled never contribute to volume.
  const recent = filterCompletedSessionRecords(sessions)
    .filter(s => s.completedAt >= weekStart)

  const direct: Record<string, number> = {}
  const secondary: Record<string, number> = {}

  for (const session of recent) {
    for (const perf of session.exercises) {
      if (perf.skipped) continue
      const contrib = muscleContributionForExercise(perf.exerciseId)
      if (!contrib) continue
      const workingSets = perf.sets.filter(s => s.completed && s.setType === 'working').length
      if (workingSets === 0) continue
      direct[contrib.primary] = (direct[contrib.primary] ?? 0) + workingSets
      for (const sec of contrib.secondary) {
        secondary[sec.muscle] = (secondary[sec.muscle] ?? 0) + workingSets * sec.weight
      }
    }
  }

  const muscles = new Set([...Object.keys(direct), ...Object.keys(secondary)]) as Set<MuscleGroup>
  const allMuscles: MuscleGroup[] = muscles.size
    ? [...muscles]
    : ['chest', 'back', 'quads', 'shoulders', 'hamstrings', 'glutes', 'biceps', 'triceps']

  return allMuscles.map(muscle => {
    const directSets = direct[muscle] ?? 0
    const secondarySets = Math.round((secondary[muscle] ?? 0) * 10) / 10
    const totalWeightedSets = Math.round((directSets + secondarySets) * 10) / 10
    let status: VolumeDataStatus = 'insufficient_data'
    if (hasFullWeek && directSets + secondarySets > 0) {
      const baseline = baselineForMuscle(sessions, muscle)
      if (baseline == null) status = 'within_baseline'
      else if (totalWeightedSets < baseline * 0.7) status = 'below_baseline'
      else if (totalWeightedSets > baseline * 1.3) status = 'above_baseline'
      else status = 'within_baseline'
    } else if (directSets + secondarySets > 0) {
      status = 'within_baseline'
    }
    return {
      muscle,
      directSets,
      secondarySets,
      totalWeightedSets,
      status,
      researchContext: 'Broad research ranges (e.g. 10–20 sets/week) are contextual only — your logged history is primary.',
    }
  })
}

function baselineForMuscle(sessions: WorkoutSessionRecord[], muscle: MuscleGroup): number | null {
  const prior = filterCompletedSessionRecords(sessions).slice(0, 14)
  if (prior.length < 2) return null
  let total = 0
  for (const s of prior) {
    for (const perf of s.exercises) {
      const c = muscleContributionForExercise(perf.exerciseId)
      if (!c) continue
      const working = perf.sets.filter(x => x.completed && x.setType === 'working').length
      if (c.primary === muscle) total += working
      else if (c.secondary.some(sec => sec.muscle === muscle)) total += working * SECONDARY_MUSCLE_WEIGHT
    }
  }
  return total / Math.max(prior.length / 3, 1)
}

export function hasCompleteTrainingWeek(sessions: WorkoutSessionRecord[]): boolean {
  const weekStart = startOfWeekISO()
  const weekSessions = filterCompletedSessionRecords(sessions)
    .filter(s => s.completedAt >= weekStart)
  return weekSessions.length >= 2 && countWorkingSets(weekSessions.flatMap(s => s.exercises)) >= 8
}

export function totalSessionVolumeKg(session: WorkoutSessionRecord): number {
  if (!isCompletedWorkoutSession(session)) return 0
  let vol = 0
  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      if (set.completed && set.setType === 'working' && set.weight > 0) {
        vol += set.weight * set.reps
      }
    }
  }
  return Math.round(vol)
}
