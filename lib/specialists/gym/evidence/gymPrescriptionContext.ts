import type { Exercise } from '../gymTypes'
import type { EquipmentProfile, GoalProfile, InjuryProfile, RecoveryStatus, WeeklyVolume, WorkoutSession } from '../gymTypes'
import type { PrescriptionContext } from './gymEvidenceTypes'
import { gatherGymData } from '../gymUtils'

export function buildPrescriptionContext(params: {
  exercise: Exercise
  goal: GoalProfile
  recovery: RecoveryStatus
  sessions: WorkoutSession[]
  volume: WeeklyVolume[]
  injuries: InjuryProfile
  equipment: EquipmentProfile
  userEvidenceIds: string[]
  shortSession?: boolean
  healthText?: string
}): PrescriptionContext {
  const muscleVolume = params.volume.find(v => v.muscle === params.exercise.primaryMuscle)
  const hasWorkoutHistory = params.sessions.some(s =>
    s.completed && s.exercises.some(e => e.sets.some(set => set.completed)),
  )

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const sessionsThisWeek = params.sessions.filter(s =>
    s.completed && s.date >= weekStart.toISOString(),
  ).length

  const recentForExercise = params.sessions
    .filter(s => s.completed)
    .flatMap(s => s.exercises.filter(e => e.exerciseId === params.exercise.id))
    .flatMap(e => e.sets.filter(set => set.completed))
  const lastSet = recentForExercise[0]

  const healthText = params.healthText ?? ''
  const painFlags: string[] = []
  if (/pain|hurt|sore|sharp/i.test(healthText)) painFlags.push('reported_pain_or_discomfort')
  if (/shoulder pain/i.test(healthText)) painFlags.push('shoulder_pain_reported')
  if (/knee pain/i.test(healthText)) painFlags.push('knee_pain_reported')

  return {
    goal: params.goal.primaryGoal,
    experience: params.goal.experience,
    hasWorkoutHistory,
    sessionsThisWeek,
    recoveryStatus: params.recovery,
    weeklyMuscleSets: muscleVolume?.sets ?? 0,
    muscle: params.exercise.primaryMuscle,
    injuryAreas: params.injuries.areas,
    painFlags,
    equipmentLimited: params.equipment.limitations.length > 0 || params.equipment.available.length <= 2,
    shortSession: params.shortSession ?? false,
    userEvidenceIds: params.userEvidenceIds,
    recentReps: lastSet?.reps ?? null,
    recentWeight: lastSet?.weight ?? null,
    estimated1RM: lastSet && lastSet.weight > 0 && lastSet.reps > 0
      ? Math.round(lastSet.weight * (1 + lastSet.reps / 30))
      : null,
    sorenessFlag: /sore|doms/i.test(healthText),
  }
}

export function extractHealthTextFromInput(input: {
  memories: { content: string }[]
  signals: { content: string }[]
}): string {
  const data = gatherGymData(input as never)
  return [
    ...data.memories.map(m => m.content),
    ...data.healthSignals.map(s => s.content),
  ].join(' ')
}
