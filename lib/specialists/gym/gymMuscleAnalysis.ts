import type { WeeklyVolume, MuscleGroup } from './gymTypes'

export function summarizeMuscleBalance(volume: WeeklyVolume[]): {
  pressingSets: number
  pullingSets: number
  legSets: number
  pushPullRatio: number | null
} {
  const pressMuscles: MuscleGroup[] = ['chest', 'front_delts', 'triceps', 'shoulders']
  const pullMuscles: MuscleGroup[] = ['back', 'rear_delts', 'biceps']
  const legMuscles: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves']

  const pressingSets = volume.filter(v => pressMuscles.includes(v.muscle)).reduce((s, v) => s + v.sets, 0)
  const pullingSets = volume.filter(v => pullMuscles.includes(v.muscle)).reduce((s, v) => s + v.sets, 0)
  const legSets = volume.filter(v => legMuscles.includes(v.muscle)).reduce((s, v) => s + v.sets, 0)

  const pushPullRatio = pullingSets > 0 ? pressingSets / pullingSets : null

  return { pressingSets, pullingSets, legSets, pushPullRatio }
}

export function neglectedMuscles(volume: WeeklyVolume[]): MuscleGroup[] {
  return volume
    .filter(v => v.status === 'below_baseline' || v.status === 'low')
    .map(v => v.muscle)
}

export function overtrainedMuscles(volume: WeeklyVolume[]): MuscleGroup[] {
  return volume.filter(v => v.status === 'high').map(v => v.muscle)
}
