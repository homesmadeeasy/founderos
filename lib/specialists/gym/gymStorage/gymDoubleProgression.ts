import type { ProgressionAction, ProgressionRecord, GymProfile } from './gymStorageTypes'
import type { WorkoutSessionRecord } from './gymStorageTypes'
import { getExerciseById } from '../gymExerciseLibrary'
import { newGymId } from './gymStorageRepository'
import { isCompletedWorkoutSession } from '../gymSessionStatus'

export interface DoubleProgressionInput {
  exerciseId: string
  exerciseName: string
  sessions: WorkoutSessionRecord[]
  targetRepRange: string
  profile: GymProfile | null
  painBlocked?: boolean
}

export interface DoubleProgressionResult {
  action: ProgressionAction
  recommendation: string
  evidence: string
  suggestedWeight?: number
  researchClaimIds: string[]
}

function parseRange(range: string): { min: number; max: number } {
  const parts = range.split('-').map(n => parseInt(n.trim(), 10)).filter(Number.isFinite)
  if (parts.length >= 2) return { min: parts[0], max: parts[1] }
  if (parts.length === 1) return { min: parts[0], max: parts[0] }
  return { min: 8, max: 10 }
}

export function computeDoubleProgression(input: DoubleProgressionInput): DoubleProgressionResult {
  const increment = input.profile?.smallestLoadIncrementKg ?? 2.5
  const range = parseRange(input.targetRepRange)

  const history = input.sessions
    .filter(isCompletedWorkoutSession)
    .flatMap(s => s.exercises.filter(e => e.exerciseId === input.exerciseId))
    .slice(0, 3)

  if (history.length === 0) {
    return {
      action: 'insufficient_data',
      recommendation: 'Log at least one completed session to unlock progression guidance.',
      evidence: 'No structured working sets found for this exercise.',
      researchClaimIds: [],
    }
  }

  const last = history[0]
  const workingSets = last.sets.filter(s => s.completed && s.setType === 'working')
  if (workingSets.length === 0) {
    return {
      action: 'insufficient_data',
      recommendation: 'Log working sets (not just warm-ups) to establish progression.',
      evidence: 'Last session had no completed working sets.',
      researchClaimIds: [],
    }
  }

  if (input.painBlocked || workingSets.some(s => s.painFlag) || last.sets.some(s => s.painFlag)) {
    const w = workingSets[0]?.weight ?? 0
    return {
      action: 'maintain',
      recommendation: `Maintain ${w}kg or reduce load — pain was reported. Do not increase until pain-free sessions.`,
      evidence: `Pain flag on last session for ${input.exerciseName}.`,
      suggestedWeight: w,
      researchClaimIds: [],
    }
  }

  const weights = workingSets.map(s => s.weight)
  const reps = workingSets.map(s => s.reps)
  const rpes = workingSets.map(s => s.rpe).filter((r): r is number => r != null)
  const weight = weights[0]
  const repStr = reps.join(', ')
  const rpeStr = rpes.length ? ` at RPE ${rpes.join('/')}` : ''
  const evidence = `Last session: ${weight} kg × ${repStr}${rpeStr}; target ${range.min}–${range.max}.`

  const allAtTop = reps.every(r => r >= range.max)
  const anyBelowMin = reps.some(r => r < range.min)
  const highEffort = rpes.some(r => r >= 9)

  if (anyBelowMin || highEffort) {
    return {
      action: highEffort ? 'reduce' : 'maintain',
      recommendation: highEffort
        ? `Consider ${Math.max(0, weight - increment)} kg next time — reps below range or effort very high.`
        : `Maintain ${weight} kg until all working sets reach at least ${range.min} reps.`,
      evidence,
      suggestedWeight: highEffort ? Math.max(0, weight - increment) : weight,
      researchClaimIds: ['claim-acsm-progression'],
    }
  }

  if (allAtTop && reps.length >= 2) {
    const next = weight + increment
    return {
      action: 'increase',
      recommendation: `All sets reached ${range.max}+ reps — try ${next} kg for ${range.min}–${range.max} reps next session.`,
      evidence,
      suggestedWeight: next,
      researchClaimIds: ['claim-acsm-progression'],
    }
  }

  return {
    action: 'maintain',
    recommendation: `Maintain ${weight} kg until all prescribed working sets reach ${range.max} reps across the set.`,
    evidence,
    suggestedWeight: weight,
    researchClaimIds: ['claim-acsm-progression'],
  }
}

export function buildProgressionRecord(
  input: DoubleProgressionInput,
  result: DoubleProgressionResult,
): ProgressionRecord {
  return {
    id: newGymId(),
    exerciseId: input.exerciseId,
    exerciseName: input.exerciseName,
    date: new Date().toISOString(),
    action: result.action,
    recommendation: result.recommendation,
    evidence: result.evidence,
    researchClaimIds: result.researchClaimIds,
    lastWeight: result.suggestedWeight,
    targetRepRange: input.targetRepRange,
  }
}

export function suggestStartingWeight(
  exerciseId: string,
  sessions: WorkoutSessionRecord[],
  profile: GymProfile | null,
): number | null {
  const history = sessions
    .filter(isCompletedWorkoutSession)
    .flatMap(s => s.exercises.filter(e => e.exerciseId === exerciseId))
    .flatMap(e => e.sets.filter(s => s.completed && s.setType === 'working' && s.weight > 0))
  if (history.length > 0) return history[0].weight

  const e1rm = profile?.estimatedOneRepMaxes?.[exerciseId]
  if (e1rm && e1rm > 0) return Math.round(e1rm * 0.7 / (profile?.smallestLoadIncrementKg ?? 2.5)) * (profile?.smallestLoadIncrementKg ?? 2.5)

  return null
}
