import type { GymRecommendation, GoalProfile, EquipmentProfile, InjuryProfile, WeeklyVolume, GymWeakness } from './gymTypes'
import { GYM_EXERCISE_LIBRARY } from './gymExerciseLibrary'
import { neglectedMuscles } from './gymMuscleAnalysis'
import { normalizeExerciseId } from './gymPlannedExerciseUtils'

function isExcluded(exerciseId: string, excludeIds: Set<string>): boolean {
  return excludeIds.has(normalizeExerciseId(exerciseId))
}

/** Pick the first library exercise for a muscle that is not already selected. */
export function pickNextExerciseForMuscle(
  muscle: string,
  excludeIds: Iterable<string>,
  equipment: EquipmentProfile,
): { exerciseId: string; exerciseName: string } | null {
  const excluded = new Set([...excludeIds].map(normalizeExerciseId))
  const candidates = GYM_EXERCISE_LIBRARY.filter(e =>
    e.primaryMuscle === muscle
    && equipment.available.includes(e.equipment)
    && !isExcluded(e.id, excluded),
  )
  const pick = candidates[0]
  return pick ? { exerciseId: pick.id, exerciseName: pick.name } : null
}

export function recommendExercises(params: {
  goal: GoalProfile
  equipment: EquipmentProfile
  injuries: InjuryProfile
  volume: WeeklyVolume[]
  weaknesses: GymWeakness[]
  excludeIds?: string[]
}): GymRecommendation[] {
  const excluded = new Set((params.excludeIds ?? []).map(normalizeExerciseId))
  const neglected = neglectedMuscles(params.volume)
  const recommendations: GymRecommendation[] = []

  for (const muscle of neglected.slice(0, 3)) {
    const pick = pickNextExerciseForMuscle(muscle, excluded, params.equipment)
    if (pick) {
      recommendations.push({
        exerciseId: pick.exerciseId,
        exerciseName: pick.exerciseName,
        reason: `${muscle.replace(/_/g, ' ')} volume is low this week.`,
        priority: 'high',
      })
      excluded.add(normalizeExerciseId(pick.exerciseId))
    }
  }

  for (const weakness of params.weaknesses.slice(0, 2)) {
    if (weakness.id === 'push-pull-imbalance') {
      const pull = GYM_EXERCISE_LIBRARY.find(e => e.id === 'barbell-row')
      if (pull && !isExcluded(pull.id, excluded)) {
        recommendations.push({
          exerciseId: pull.id,
          exerciseName: pull.name,
          reason: 'Balance pressing with horizontal pulling.',
          priority: 'high',
        })
        excluded.add(normalizeExerciseId(pull.id))
      }
    }
    if (weakness.id === 'insufficient-legs') {
      const squat = GYM_EXERCISE_LIBRARY.find(e => e.id === 'barbell-squat')
      if (squat && params.equipment.available.includes('barbell') && !isExcluded(squat.id, excluded)) {
        recommendations.push({
          exerciseId: squat.id,
          exerciseName: squat.name,
          reason: 'Rebuild lower-body training stimulus.',
          priority: 'high',
        })
        excluded.add(normalizeExerciseId(squat.id))
      }
    }
  }

  if (params.goal.primaryGoal === 'muscle_growth') {
    const isolation = GYM_EXERCISE_LIBRARY.find(e => e.id === 'lateral-raise')
    if (
      isolation
      && !isExcluded(isolation.id, excluded)
      && !recommendations.some(r => normalizeExerciseId(r.exerciseId) === normalizeExerciseId(isolation.id))
    ) {
      recommendations.push({
        exerciseId: isolation.id,
        exerciseName: isolation.name,
        reason: 'Side delts respond well to higher-rep hypertrophy work.',
        priority: 'medium',
      })
      excluded.add(normalizeExerciseId(isolation.id))
    } else if (isolation && isExcluded(isolation.id, excluded)) {
      // Already in the session — pick a different hypertrophy accessory instead of reusing it.
      const alt = GYM_EXERCISE_LIBRARY.find(e =>
        e.compound === false
        && e.id !== isolation.id
        && params.equipment.available.includes(e.equipment)
        && !isExcluded(e.id, excluded)
        && (e.primaryMuscle === 'side_delts' || e.primaryMuscle === 'triceps' || e.primaryMuscle === 'chest'),
      )
      if (alt) {
        recommendations.push({
          exerciseId: alt.id,
          exerciseName: alt.name,
          reason: 'Accessory volume for hypertrophy (lateral raise already selected).',
          priority: 'medium',
        })
        excluded.add(normalizeExerciseId(alt.id))
      }
    }
  }

  if (params.injuries.areas.includes('knee')) {
    return recommendations.filter(r => r.exerciseId !== 'barbell-squat')
  }

  const seen = new Set<string>()
  return recommendations.filter(r => {
    const id = normalizeExerciseId(r.exerciseId)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  }).slice(0, 5)
}
