import type { GymSnapshot } from './gymTypes'
import { GYM_GOAL_LABELS } from './gymTypes'

export function generateGymNarrative(snapshot: Pick<
  GymSnapshot,
  'recoveryStatus' | 'goalProfile' | 'hasWorkoutHistory' | 'sessionsThisWeek' | 'mainInsight' | 'weaknesses' | 'momentumScore'
>): string {
  const goal = GYM_GOAL_LABELS[snapshot.goalProfile.primaryGoal]
  const parts: string[] = []

  if (!snapshot.hasWorkoutHistory) {
    parts.push(`Gym AI is calibrated for **${goal}**, but no structured workout history is logged yet.`)
    parts.push('Log sets in Memory or create workout objects to unlock progression and volume analysis.')
  } else {
    parts.push(`Training toward **${goal}** with **${snapshot.sessionsThisWeek}** session(s) this week.`)
  }

  parts.push(snapshot.mainInsight)

  if (snapshot.recoveryStatus === 'recover' || snapshot.recoveryStatus === 'deload') {
    parts.push('Recovery signals suggest backing off intensity today.')
  } else if (snapshot.recoveryStatus === 'ready') {
    parts.push('Recovery looks adequate for a productive session.')
  }

  if (snapshot.weaknesses[0]) {
    parts.push(`Primary gap: **${snapshot.weaknesses[0].title}**.`)
  }

  return parts.join(' ')
}
