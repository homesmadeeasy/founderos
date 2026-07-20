import type { GoalProfile, EquipmentProfile, InjuryProfile, GymGoal } from './gymTypes'
import type { GymProfile } from './gymStorage/gymStorageTypes'
import { GYM_GOAL_LABELS } from './gymTypes'
import { isProfileComplete } from './gymStorage/gymStorageSchema'

export function gymProfileToGoalProfile(profile: GymProfile | null): GoalProfile | null {
  if (!profile || !isProfileComplete(profile)) return null
  const goal = profile.primaryGoal === 'fat_loss_maintain_muscle' ? 'weight_loss' : profile.primaryGoal
  return {
    primaryGoal: goal as GymGoal,
    label: GYM_GOAL_LABELS[goal as GymGoal] ?? goal,
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    experience: profile.experience,
  }
}

export function gymProfileToEquipmentProfile(profile: GymProfile | null): EquipmentProfile | null {
  if (!profile || !isProfileComplete(profile)) return null
  return {
    available: profile.equipment.length > 0 ? profile.equipment : ['bodyweight'],
    limitations: profile.injuryLimitations,
  }
}

export function gymProfileToInjuryProfile(profile: GymProfile | null): InjuryProfile | null {
  if (!profile || !isProfileComplete(profile)) return null
  return {
    areas: profile.injuryLimitations,
    restrictions: profile.injuryLimitations,
  }
}

export function createDefaultGymProfile(): GymProfile {
  const now = new Date().toISOString()
  return {
    id: `gym-profile-${Date.now()}`,
    complete: false,
    primaryGoal: 'muscle_growth',
    experience: 'beginner',
    trainingDaysPerWeek: 3,
    sessionDurationMinutes: 60,
    equipment: ['barbell', 'dumbbell'],
    preferredSplit: 'auto',
    exercisesEnjoy: [],
    exercisesDislike: [],
    injuryLimitations: [],
    targetMuscles: [],
    estimatedOneRepMaxes: {},
    trackingMode: 'rpe',
    smallestLoadIncrementKg: 2.5,
    createdAt: now,
    updatedAt: now,
  }
}

export function buildSetupChecklist(profile: GymProfile | null, sessionCount: number): {
  id: string
  label: string
  done: boolean
}[] {
  const complete = isProfileComplete(profile)
  const hasSessions = sessionCount >= 1
  const hasWeights = sessionCount >= 1
  const twoWeeks = sessionCount >= 4
  return [
    { id: 'profile', label: 'Profile complete', done: complete },
    { id: 'equipment', label: 'Equipment configured', done: complete && (profile?.smallestLoadIncrementKg ?? 0) > 0 },
    { id: 'first_workout', label: 'First workout logged', done: hasSessions },
    { id: 'working_weights', label: 'Working weights established', done: hasWeights },
    { id: 'two_weeks', label: 'Two weeks of history collected', done: twoWeeks },
  ]
}
