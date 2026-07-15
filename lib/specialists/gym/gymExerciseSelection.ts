import type { GymRecommendation, GoalProfile, EquipmentProfile, InjuryProfile, WeeklyVolume, GymWeakness } from './gymTypes'
import { GYM_EXERCISE_LIBRARY } from './gymExerciseLibrary'
import { neglectedMuscles } from './gymMuscleAnalysis'

export function recommendExercises(params: {
  goal: GoalProfile
  equipment: EquipmentProfile
  injuries: InjuryProfile
  volume: WeeklyVolume[]
  weaknesses: GymWeakness[]
  excludeIds?: string[]
}): GymRecommendation[] {
  const neglected = neglectedMuscles(params.volume)
  const recommendations: GymRecommendation[] = []

  for (const muscle of neglected.slice(0, 3)) {
    const candidates = GYM_EXERCISE_LIBRARY.filter(e =>
      e.primaryMuscle === muscle
      && params.equipment.available.includes(e.equipment)
      && !params.excludeIds?.includes(e.id),
    )
    const pick = candidates[0]
    if (pick) {
      recommendations.push({
        exerciseId: pick.id,
        exerciseName: pick.name,
        reason: `${muscle.replace(/_/g, ' ')} volume is low this week.`,
        priority: 'high',
      })
    }
  }

  for (const weakness of params.weaknesses.slice(0, 2)) {
    if (weakness.id === 'push-pull-imbalance') {
      const pull = GYM_EXERCISE_LIBRARY.find(e => e.id === 'barbell-row')
      if (pull) {
        recommendations.push({
          exerciseId: pull.id,
          exerciseName: pull.name,
          reason: 'Balance pressing with horizontal pulling.',
          priority: 'high',
        })
      }
    }
    if (weakness.id === 'insufficient-legs') {
      const squat = GYM_EXERCISE_LIBRARY.find(e => e.id === 'barbell-squat')
      if (squat && params.equipment.available.includes('barbell')) {
        recommendations.push({
          exerciseId: squat.id,
          exerciseName: squat.name,
          reason: 'Rebuild lower-body training stimulus.',
          priority: 'high',
        })
      }
    }
  }

  if (params.goal.primaryGoal === 'muscle_growth') {
    const isolation = GYM_EXERCISE_LIBRARY.find(e => e.id === 'lateral-raise')
    if (isolation && !recommendations.some(r => r.exerciseId === isolation.id)) {
      recommendations.push({
        exerciseId: isolation.id,
        exerciseName: isolation.name,
        reason: 'Side delts respond well to higher-rep hypertrophy work.',
        priority: 'medium',
      })
    }
  }

  if (params.injuries.areas.includes('knee')) {
    return recommendations.filter(r => r.exerciseId !== 'barbell-squat')
  }

  const seen = new Set<string>()
  return recommendations.filter(r => {
    if (seen.has(r.exerciseId)) return false
    seen.add(r.exerciseId)
    return true
  }).slice(0, 5)
}
