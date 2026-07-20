import type { WeeklyVolume, MuscleGroup, VolumeStatus, WorkoutSession } from './gymTypes'
import type { WorkoutSessionRecord } from './gymStorage/gymStorageTypes'
import { getExerciseById } from './gymExerciseLibrary'
import { allMuscleGroups, startOfWeekISO } from './gymUtils'
import {
  computeMuscleVolumeFromSessions,
  hasCompleteTrainingWeek,
  SECONDARY_MUSCLE_WEIGHT,
} from './gymStorage/gymMuscleMapping'

function isWorkingSet(set: { completed: boolean; setType?: 'warmup' | 'working' }): boolean {
  if (!set.completed) return false
  return set.setType !== 'warmup'
}

function volumeStatusFromBreakdown(
  status: 'insufficient_data' | 'below_baseline' | 'within_baseline' | 'above_baseline',
  directSets: number,
  secondarySets: number,
): VolumeStatus {
  if (directSets + secondarySets === 0) return 'insufficient_data'
  if (status === 'insufficient_data') return 'within_baseline'
  return status
}

export function computeWeeklyVolume(
  sessions: WorkoutSession[],
  recoveringMuscles: MuscleGroup[] = [],
  structuredRecords: WorkoutSessionRecord[] = [],
): WeeklyVolume[] {
  const weekStart = startOfWeekISO()
  const hasFullWeek = hasCompleteTrainingWeek(structuredRecords)
  const breakdown = computeMuscleVolumeFromSessions(structuredRecords, hasFullWeek)

  if (structuredRecords.length > 0) {
    return breakdown.map(b => {
      let status = volumeStatusFromBreakdown(b.status, b.directSets, b.secondarySets)
      if (recoveringMuscles.includes(b.muscle) && b.directSets + b.secondarySets > 0) {
        status = 'recovering'
      }
      return {
        muscle: b.muscle,
        sets: Math.round((b.directSets + b.secondarySets) * 10) / 10,
        directSets: b.directSets,
        secondarySets: b.secondarySets,
        status,
        trend: b.directSets > 0 ? 'stable' as const : 'unknown' as const,
      }
    })
  }

  const recent = sessions.filter(s => s.date >= weekStart)
  const setCounts = Object.fromEntries(
    allMuscleGroups().map(m => [m, 0]),
  ) as Record<MuscleGroup, number>

  for (const session of recent) {
    for (const perf of session.exercises) {
      const exercise = getExerciseById(perf.exerciseId)
      const setCount = perf.sets.filter(isWorkingSet).length
      if (setCount === 0) continue
      if (exercise) {
        setCounts[exercise.primaryMuscle] += setCount
        for (const sec of exercise.secondaryMuscles) {
          setCounts[sec] += setCount * SECONDARY_MUSCLE_WEIGHT
        }
      }
    }
  }

  return allMuscleGroups().map(muscle => {
    const sets = Math.round(setCounts[muscle] * 10) / 10
    let status: VolumeStatus = sets === 0 ? 'insufficient_data' : 'within_baseline'
    if (recoveringMuscles.includes(muscle) && sets > 0) status = 'recovering'
    return {
      muscle,
      sets,
      status,
      trend: sets > 0 ? 'stable' as const : 'unknown' as const,
    }
  })
}

export function totalWeeklySets(volume: WeeklyVolume[]): number {
  return volume.reduce((sum, v) => sum + v.sets, 0)
}

export function volumeScoreFromWeekly(volume: WeeklyVolume[]): number {
  const tracked = volume.filter(v => v.sets > 0 && v.status !== 'insufficient_data')
  if (tracked.length === 0) return 35
  const within = tracked.filter(v => v.status === 'within_baseline' || v.status === 'optimal').length
  const below = volume.filter(v => v.status === 'below_baseline' || v.status === 'low').length
  const base = Math.round((within / Math.max(tracked.length, 1)) * 70)
  return Math.max(20, Math.min(95, base - below * 2))
}
