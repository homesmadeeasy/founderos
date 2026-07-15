import type { StrengthEstimate, WorkoutSession } from './gymTypes'
import { getExerciseById } from './gymExerciseLibrary'

function estimateE1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return Math.round(weight * (1 + reps / 30))
}

export function computeStrengthEstimates(sessions: WorkoutSession[]): StrengthEstimate[] {
  const byExercise = new Map<string, { weights: number[]; reps: number[]; dates: string[]; best: { weight: number; reps: number; date: string } | null }>()

  for (const session of sessions) {
    for (const perf of session.exercises) {
      if (!byExercise.has(perf.exerciseId)) {
        byExercise.set(perf.exerciseId, { weights: [], reps: [], dates: [], best: null })
      }
      const entry = byExercise.get(perf.exerciseId)!
      for (const set of perf.sets) {
        if (!set.completed || set.weight <= 0) continue
        entry.weights.push(set.weight)
        entry.reps.push(set.reps)
        entry.dates.push(session.date)
        const e1rm = estimateE1RM(set.weight, set.reps)
        const prevBest = entry.best ? estimateE1RM(entry.best.weight, entry.best.reps) : 0
        if (e1rm >= prevBest) {
          entry.best = { weight: set.weight, reps: set.reps, date: session.date }
        }
      }
    }
  }

  const estimates: StrengthEstimate[] = []
  for (const [exerciseId, data] of byExercise) {
    const exercise = getExerciseById(exerciseId)
    const lastWeight = data.weights[data.weights.length - 1] ?? null
    const lastReps = data.reps[data.reps.length - 1] ?? null
    const recent = data.weights.slice(-3)
    let trend: StrengthEstimate['trend'] = 'unknown'
    if (recent.length >= 2) {
      if (recent[recent.length - 1] > recent[0]) trend = 'up'
      else if (recent[recent.length - 1] < recent[0]) trend = 'down'
      else trend = 'plateau'
    }

    const lastE1rm = lastWeight && lastReps ? estimateE1RM(lastWeight, lastReps) : null

    estimates.push({
      exerciseId,
      exerciseName: exercise?.name ?? exerciseId,
      estimatedMax: lastE1rm,
      trend,
      lastWeight,
      lastReps,
      personalBest: data.best,
    })
  }

  return estimates.sort((a, b) => (b.estimatedMax ?? 0) - (a.estimatedMax ?? 0)).slice(0, 8)
}

export interface ProgressionAdvice {
  exerciseId: string
  exerciseName: string
  recommendation: string
  type: 'increase_weight' | 'increase_reps' | 'deload' | 'maintain' | 'insufficient_data'
}

export function buildProgressionAdvice(estimates: StrengthEstimate[]): ProgressionAdvice[] {
  return estimates.map(est => {
    if (!est.lastWeight || !est.lastReps) {
      return {
        exerciseId: est.exerciseId,
        exerciseName: est.exerciseName,
        recommendation: 'Log sets with weight to unlock progression guidance.',
        type: 'insufficient_data',
      }
    }
    if (est.trend === 'plateau') {
      return {
        exerciseId: est.exerciseId,
        exerciseName: est.exerciseName,
        recommendation: `Plateau detected — try +1 rep at ${est.lastWeight}kg or a micro-load (+2.5kg) for 5 reps.`,
        type: 'increase_reps',
      }
    }
    if (est.trend === 'down') {
      return {
        exerciseId: est.exerciseId,
        exerciseName: est.exerciseName,
        recommendation: `Reduce load ~10% (${Math.round(est.lastWeight * 0.9)}kg) and rebuild volume.`,
        type: 'deload',
      }
    }
    if (est.lastReps >= 10) {
      return {
        exerciseId: est.exerciseId,
        exerciseName: est.exerciseName,
        recommendation: `Increase weight to ${est.lastWeight + 2.5}kg for ${Math.max(6, est.lastReps - 2)} reps.`,
        type: 'increase_weight',
      }
    }
    return {
      exerciseId: est.exerciseId,
      exerciseName: est.exerciseName,
      recommendation: `Add 1 rep per set before increasing weight (currently ${est.lastWeight}kg × ${est.lastReps}).`,
      type: 'increase_reps',
    }
  })
}

export function progressionScoreFromEstimates(estimates: StrengthEstimate[]): number {
  if (estimates.length === 0) return 40
  const trending = estimates.filter(e => e.trend === 'up').length
  const plateau = estimates.filter(e => e.trend === 'plateau').length
  const base = 50 + trending * 12 - plateau * 5
  return Math.max(25, Math.min(92, base))
}

export function detectPlateaus(estimates: StrengthEstimate[]): StrengthEstimate[] {
  return estimates.filter(e => e.trend === 'plateau')
}

export function detectPersonalBests(estimates: StrengthEstimate[]): StrengthEstimate[] {
  return estimates.filter(e => e.personalBest != null)
}
