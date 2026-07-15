import type { GymEvidenceClaim, PrescriptionVariable, TrainingGoal } from './gymEvidenceTypes'
import { listApprovedClaims, listEvidenceClaims } from './gymEvidenceRegistry'

export function claimsForVariable(variable: PrescriptionVariable, goal?: TrainingGoal): GymEvidenceClaim[] {
  const approved = listApprovedClaims().filter(c => c.variable === variable)
  if (!goal) return approved
  return approved.filter(c => c.goals.includes(goal))
}

export function claimsForGoal(goal: TrainingGoal): GymEvidenceClaim[] {
  return listApprovedClaims().filter(c => c.goals.includes(goal))
}

export function provisionalClaims(): GymEvidenceClaim[] {
  return listEvidenceClaims({ status: 'provisional' })
}

export function claimById(id: string): GymEvidenceClaim | undefined {
  return listApprovedClaims().find(c => c.id === id)
}

export function mapGymGoalToTrainingGoal(goal: string): TrainingGoal {
  const map: Record<string, TrainingGoal> = {
    muscle_growth: 'muscle_growth',
    strength: 'strength',
    powerlifting: 'powerlifting',
    athletic_performance: 'athletic_performance',
    weight_loss: 'weight_loss',
    general_fitness: 'general_fitness',
  }
  return map[goal] ?? 'general_fitness'
}
