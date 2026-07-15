import type { WeeklyVolume, MuscleGroup, VolumeStatus } from './gymTypes'
import type { WorkoutSession } from './gymTypes'
import { getExerciseById } from './gymExerciseLibrary'
import { allMuscleGroups, startOfWeekISO } from './gymUtils'

const OPTIMAL_SETS: Record<MuscleGroup, { min: number; max: number }> = {
  chest: { min: 10, max: 20 },
  back: { min: 12, max: 22 },
  shoulders: { min: 8, max: 18 },
  front_delts: { min: 4, max: 12 },
  side_delts: { min: 8, max: 16 },
  rear_delts: { min: 6, max: 14 },
  triceps: { min: 6, max: 14 },
  biceps: { min: 6, max: 14 },
  forearms: { min: 2, max: 8 },
  quads: { min: 10, max: 20 },
  hamstrings: { min: 8, max: 16 },
  glutes: { min: 8, max: 16 },
  calves: { min: 6, max: 14 },
  abs: { min: 4, max: 12 },
  lower_back: { min: 4, max: 10 },
}

function classifyVolume(muscle: MuscleGroup, sets: number): VolumeStatus {
  const range = OPTIMAL_SETS[muscle]
  if (sets === 0) return 'neglected'
  if (sets < range.min * 0.5) return 'low'
  if (sets > range.max * 1.25) return 'high'
  if (sets >= range.min && sets <= range.max) return 'optimal'
  if (sets < range.min) return 'low'
  return 'high'
}

export function computeWeeklyVolume(
  sessions: WorkoutSession[],
  recoveringMuscles: MuscleGroup[] = [],
): WeeklyVolume[] {
  const weekStart = startOfWeekISO()
  const recent = sessions.filter(s => s.date >= weekStart)

  const setCounts = Object.fromEntries(
    allMuscleGroups().map(m => [m, 0]),
  ) as Record<MuscleGroup, number>

  for (const session of recent) {
    for (const perf of session.exercises) {
      const exercise = getExerciseById(perf.exerciseId)
      const setCount = perf.sets.filter(s => s.completed).length
      if (setCount === 0) continue

      if (exercise) {
        setCounts[exercise.primaryMuscle] += setCount
        for (const sec of exercise.secondaryMuscles) {
          setCounts[sec] += Math.ceil(setCount * 0.5)
        }
      }
    }
  }

  return allMuscleGroups().map(muscle => {
    const sets = setCounts[muscle]
    let status = classifyVolume(muscle, sets)
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
  const tracked = volume.filter(v => v.sets > 0)
  if (tracked.length === 0) return 35
  const optimal = tracked.filter(v => v.status === 'optimal').length
  const neglected = volume.filter(v => v.status === 'neglected').length
  const base = Math.round((optimal / Math.max(tracked.length, 1)) * 70)
  return Math.max(20, Math.min(95, base - neglected * 3))
}
