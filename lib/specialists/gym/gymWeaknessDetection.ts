import type { GymWeakness, WeeklyVolume, WorkoutSession, GoalProfile } from './gymTypes'
import { summarizeMuscleBalance, neglectedMuscles, overtrainedMuscles } from './gymMuscleAnalysis'
import { GYM_EXERCISE_LIBRARY } from './gymExerciseLibrary'

export function detectWeaknesses(
  volume: WeeklyVolume[],
  sessions: WorkoutSession[],
  goal: GoalProfile,
): GymWeakness[] {
  const weaknesses: GymWeakness[] = []
  const hasVolumeData = volume.some(v => v.sets > 0 && v.status !== 'insufficient_data')
  if (!hasVolumeData) return weaknesses

  const balance = summarizeMuscleBalance(volume)

  for (const muscle of neglectedMuscles(volume).slice(0, 4)) {
    weaknesses.push({
      id: `neglected-${muscle}`,
      title: `${muscle.replace(/_/g, ' ')} undertrained`,
      severity: goal.primaryGoal === 'muscle_growth' ? 'high' : 'medium',
      description: `Low weekly set count for ${muscle.replace(/_/g, ' ')}.`,
      muscle,
    })
  }

  if (balance.pushPullRatio != null && balance.pushPullRatio > 1.4) {
    weaknesses.push({
      id: 'push-pull-imbalance',
      title: 'Too much pressing vs pulling',
      severity: 'high',
      description: `Push:pull ratio ${balance.pushPullRatio.toFixed(1)} — add rows, pulldowns, or face pulls.`,
    })
  }

  if (balance.legSets < 8 && sessions.length > 0) {
    weaknesses.push({
      id: 'insufficient-legs',
      title: 'Insufficient leg volume',
      severity: 'high',
      description: `Only ${balance.legSets} leg sets this week — quads, hamstrings, and glutes need more work.`,
    })
  }

  for (const muscle of overtrainedMuscles(volume).slice(0, 2)) {
    weaknesses.push({
      id: `overtrain-${muscle}`,
      title: `${muscle.replace(/_/g, ' ')} volume high`,
      severity: 'medium',
      description: 'Weekly sets exceed optimal range — watch fatigue and recovery.',
      muscle,
    })
  }

  const usedExerciseIds = new Set(sessions.flatMap(s => s.exercises.map(e => e.exerciseId)))
  const compoundIds = GYM_EXERCISE_LIBRARY.filter(e => e.compound).map(e => e.id)
  const missingCompounds = compoundIds.filter(id => !usedExerciseIds.has(id))
  if (sessions.length >= 3 && missingCompounds.includes('barbell-squat')) {
    weaknesses.push({
      id: 'missing-squat-pattern',
      title: 'Squat pattern underrepresented',
      severity: 'medium',
      description: 'No logged squat work — lower-body strength may lag.',
    })
  }

  return weaknesses
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, 6)
}

function severityWeight(s: GymWeakness['severity']): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1
}
