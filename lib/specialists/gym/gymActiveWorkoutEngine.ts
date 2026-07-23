/**
 * Active Workout Engine — live metrics, next-set advice, and completion summary.
 * Reuses double progression, muscle mapping, and e1RM helpers. Does not invent sets.
 */

import type {
  ActiveWorkout,
  ApprovedWorkoutPlan,
  ExercisePerformanceRecord,
  GymProfile,
  ProgressionRecord,
  SetPerformanceRecord,
  WorkoutSessionRecord,
} from './gymStorage/gymStorageTypes'
import { computeDoubleProgression, type DoubleProgressionResult } from './gymStorage/gymDoubleProgression'
import {
  computeMuscleVolumeFromSessions,
  countWorkingSets,
  muscleContributionForExercise,
  totalSessionVolumeKg,
} from './gymStorage/gymMuscleMapping'
import { estimateE1RM } from './gymProgression'
import { getExerciseById } from './gymExerciseLibrary'
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from './gymTypes'
import { filterCompletedSessionRecords } from './gymSessionStatus'

export interface PreviousPerformance {
  weight: number
  reps: number
  rpe?: number
  date: string
  source: 'history' | 'this_session'
  note: string
}

export interface LiveSetAdvice {
  action: DoubleProgressionResult['action'] | 'continue'
  recommendation: string
  evidence: string
  suggestedWeight?: number
  estimatedE1RM: number | null
  assumptionNote?: string
}

export interface LiveWorkoutMetrics {
  sessionVolumeKg: number
  completedWorkingSets: number
  prescribedWorkingSets: number
  fatigueScore: number
  recoveryHint: string
  estimatedE1RMByExercise: { exerciseId: string; exerciseName: string; e1rm: number | null; assumption: string }[]
  nextSetAdvice: LiveSetAdvice | null
  previousPerformance: PreviousPerformance | null
}

export interface WorkoutSummaryDetail {
  summaryText: string
  volumeByMuscle: { muscle: MuscleGroup; label: string; sets: number }[]
  progression: { exerciseName: string; action: string; recommendation: string }[]
  recoveryPrediction: string
  prs: { exerciseName: string; detail: string; e1rm: number }[]
  adherenceScore: number
  musclesTrained: string[]
  suggestedNextSession: string
  assumptions: string[]
  durationMinutes: number
  totalVolumeKg: number
}

export function exerciseKey(ex: ExercisePerformanceRecord): string {
  return ex.plannedExerciseId ?? `${ex.exerciseId}::${ex.order}`
}

export function findCurrentExerciseIndex(workout: ActiveWorkout): number {
  const idx = workout.exercises.findIndex(ex => {
    if (ex.skipped) return false
    return ex.sets.some(s => !s.completed)
  })
  return idx >= 0 ? idx : Math.max(0, workout.exercises.findIndex(ex => !ex.skipped))
}

export function findCurrentSet(ex: ExercisePerformanceRecord): SetPerformanceRecord | null {
  return ex.sets.find(s => !s.completed) ?? null
}

export function isExerciseFinished(ex: ExercisePerformanceRecord): boolean {
  if (ex.skipped) return true
  return ex.sets.length > 0 && ex.sets.every(s => s.completed)
}

export function restSecondsForExercise(exerciseId: string, plan?: ApprovedWorkoutPlan | null): number {
  const planned = plan?.exercises.find(e => e.exerciseId === exerciseId)
  if (planned?.targetRpe != null && planned.targetRpe >= 8) {
    const lib = getExerciseById(exerciseId)
    return lib?.restSeconds ?? 120
  }
  return getExerciseById(exerciseId)?.restSeconds ?? 90
}

export function getPreviousPerformance(
  exerciseId: string,
  workout: ActiveWorkout,
  historySessions: WorkoutSessionRecord[],
): PreviousPerformance | null {
  const current = workout.exercises.find(e => e.exerciseId === exerciseId && !e.skipped)
  const completedHere = current?.sets.filter(s => s.completed && s.setType === 'working' && s.weight > 0) ?? []
  if (completedHere.length > 0) {
    const last = completedHere[completedHere.length - 1]
    return {
      weight: last.weight,
      reps: last.reps,
      rpe: last.rpe,
      date: workout.startedAt,
      source: 'this_session',
      note: 'From earlier in this workout',
    }
  }

  const completed = filterCompletedSessionRecords(historySessions)
  for (const session of completed) {
    const ex = session.exercises.find(e => e.exerciseId === exerciseId && !e.skipped)
    const working = ex?.sets.filter(s => s.completed && s.setType === 'working' && s.weight > 0) ?? []
    if (working.length > 0) {
      const best = working.reduce((a, b) => (a.weight >= b.weight ? a : b))
      return {
        weight: best.weight,
        reps: best.reps,
        rpe: best.rpe,
        date: session.completedAt,
        source: 'history',
        note: 'From last completed session (not invented)',
      }
    }
  }
  return null
}

function sessionVolumeFromActive(workout: ActiveWorkout): number {
  const fake: WorkoutSessionRecord = {
    id: workout.id,
    date: workout.startedAt,
    startedAt: workout.startedAt,
    completedAt: workout.updatedAt,
    title: workout.title,
    exercises: workout.exercises.filter(e => !e.skipped),
    completed: false,
    status: 'in_progress',
    painFlags: [],
    source: 'gym_logger',
  }
  return totalSessionVolumeKg(fake)
}

function fatigueFromWorkout(workout: ActiveWorkout): number {
  const done = workout.exercises.flatMap(e => e.sets.filter(s => s.completed && s.setType === 'working'))
  if (done.length === 0) return 0
  const rpes = done.map(s => s.rpe).filter((r): r is number => typeof r === 'number')
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 7
  const volumeFactor = Math.min(40, done.length * 4)
  return Math.max(0, Math.min(100, Math.round(volumeFactor + (avgRpe - 5) * 8)))
}

export function adviseNextSet(params: {
  exercise: ExercisePerformanceRecord
  justCompleted: SetPerformanceRecord
  targetRepRange: string
  profile: GymProfile | null
  historySessions: WorkoutSessionRecord[]
}): LiveSetAdvice {
  const { exercise, justCompleted, targetRepRange, profile, historySessions } = params
  const increment = profile?.smallestLoadIncrementKg ?? 2.5
  const e1rm = justCompleted.weight > 0 && justCompleted.reps > 0
    ? estimateE1RM(justCompleted.weight, justCompleted.reps)
    : null

  if (justCompleted.painFlag) {
    return {
      action: 'maintain',
      recommendation: 'Pain flagged — keep load the same or stop this exercise. Do not increase.',
      evidence: 'Discomfort reported on the set just logged.',
      suggestedWeight: justCompleted.weight,
      estimatedE1RM: e1rm,
    }
  }

  const parts = targetRepRange.split('-').map(n => parseInt(n.trim(), 10)).filter(Number.isFinite)
  const min = parts[0] ?? 8
  const max = parts[1] ?? parts[0] ?? 10
  const completedWorking = exercise.sets.filter(s => s.completed && s.setType === 'working')
  const remaining = exercise.sets.filter(s => !s.completed)

  if (justCompleted.rpe != null && justCompleted.rpe >= 9.5) {
    return {
      action: 'reduce',
      recommendation: remaining.length
        ? `Drop ~${increment} kg for the next set — RPE ${justCompleted.rpe} is very high.`
        : `High effort this set. Prefer ${Math.max(0, justCompleted.weight - increment)} kg next session.`,
      evidence: `Logged ${justCompleted.weight} kg × ${justCompleted.reps} at RPE ${justCompleted.rpe}.`,
      suggestedWeight: Math.max(0, justCompleted.weight - increment),
      estimatedE1RM: e1rm,
    }
  }

  if (justCompleted.reps < min) {
    return {
      action: 'reduce',
      recommendation: remaining.length
        ? `Reps below ${min} — reduce ${increment} kg for remaining sets or stop early.`
        : `Missed the ${min}–${max} target. Maintain or reduce next session.`,
      evidence: `Set: ${justCompleted.weight} kg × ${justCompleted.reps} (target ≥ ${min}).`,
      suggestedWeight: Math.max(0, justCompleted.weight - increment),
      estimatedE1RM: e1rm,
    }
  }

  if (justCompleted.reps >= max && (justCompleted.rpe == null || justCompleted.rpe <= 8) && remaining.length > 0) {
    return {
      action: 'increase',
      recommendation: `Hit top of range with room left — try ${justCompleted.weight + increment} kg on the next set.`,
      evidence: `${justCompleted.weight} kg × ${justCompleted.reps} within ${min}–${max}.`,
      suggestedWeight: justCompleted.weight + increment,
      estimatedE1RM: e1rm,
    }
  }

  // Fall back to historical double progression when no remaining sets.
  if (remaining.length === 0) {
    const historical = computeDoubleProgression({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      sessions: historySessions,
      targetRepRange,
      profile,
      painBlocked: completedWorking.some(s => s.painFlag),
    })
    return {
      action: historical.action,
      recommendation: historical.recommendation,
      evidence: historical.evidence,
      suggestedWeight: historical.suggestedWeight,
      estimatedE1RM: e1rm,
      assumptionNote: historical.action === 'insufficient_data'
        ? 'No prior completed sessions for this exercise — guidance uses only this workout.'
        : undefined,
    }
  }

  return {
    action: 'continue',
    recommendation: `Keep ${justCompleted.weight} kg for the next set — aim for ${min}–${max} reps.`,
    evidence: `Last set: ${justCompleted.weight} kg × ${justCompleted.reps}.`,
    suggestedWeight: justCompleted.weight,
    estimatedE1RM: e1rm,
  }
}

export function computeLiveWorkoutMetrics(params: {
  workout: ActiveWorkout
  exercise: ExercisePerformanceRecord | null
  justCompletedSet?: SetPerformanceRecord | null
  targetRepRange: string
  profile: GymProfile | null
  historySessions: WorkoutSessionRecord[]
}): LiveWorkoutMetrics {
  const { workout, exercise, justCompletedSet, targetRepRange, profile, historySessions } = params
  const completedWorkingSets = countWorkingSets(workout.exercises.filter(e => !e.skipped))
  const prescribedWorkingSets = workout.exercises
    .filter(e => !e.skipped)
    .reduce((n, ex) => n + ex.sets.filter(s => s.setType === 'working').length, 0)

  const estimatedE1RMByExercise = workout.exercises.filter(e => !e.skipped).map(ex => {
    const working = ex.sets.filter(s => s.completed && s.setType === 'working' && s.weight > 0)
    if (working.length === 0) {
      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        e1rm: null as number | null,
        assumption: 'No completed working sets yet — e1RM not estimated.',
      }
    }
    const best = working.reduce((a, b) =>
      estimateE1RM(a.weight, a.reps) >= estimateE1RM(b.weight, b.reps) ? a : b,
    )
    return {
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      e1rm: estimateE1RM(best.weight, best.reps),
      assumption: 'Estimated from logged sets this session (Epley-style).',
    }
  })

  const fatigueScore = fatigueFromWorkout(workout)
  const recoveryHint = fatigueScore >= 75
    ? 'Fatigue running high — consider shorter rest or finishing early if form slips.'
    : fatigueScore >= 45
      ? 'Moderate fatigue — keep rest intervals honest and watch RPE climb.'
      : 'Fresh enough — stay on plan unless pain appears.'

  const nextSetAdvice = exercise && justCompletedSet
    ? adviseNextSet({
      exercise,
      justCompleted: justCompletedSet,
      targetRepRange,
      profile,
      historySessions: filterCompletedSessionRecords(historySessions),
    })
    : null

  const previousPerformance = exercise
    ? getPreviousPerformance(exercise.exerciseId, workout, historySessions)
    : null

  return {
    sessionVolumeKg: sessionVolumeFromActive(workout),
    completedWorkingSets,
    prescribedWorkingSets,
    fatigueScore,
    recoveryHint,
    estimatedE1RMByExercise,
    nextSetAdvice,
    previousPerformance,
  }
}

export function detectSessionPRs(
  session: WorkoutSessionRecord,
  historySessions: WorkoutSessionRecord[],
): { exerciseName: string; detail: string; e1rm: number }[] {
  const prior = filterCompletedSessionRecords(historySessions)
    .filter(s => s.id !== session.id)
  const prs: { exerciseName: string; detail: string; e1rm: number }[] = []

  for (const ex of session.exercises) {
    if (ex.skipped) continue
    const working = ex.sets.filter(s => s.completed && s.setType === 'working' && s.weight > 0)
    if (working.length === 0) continue
    const bestNow = working.reduce((a, b) =>
      estimateE1RM(a.weight, a.reps) >= estimateE1RM(b.weight, b.reps) ? a : b,
    )
    const nowE1 = estimateE1RM(bestNow.weight, bestNow.reps)
    let bestPrior = 0
    for (const s of prior) {
      for (const pe of s.exercises.filter(e => e.exerciseId === ex.exerciseId)) {
        for (const set of pe.sets.filter(st => st.completed && st.setType === 'working' && st.weight > 0)) {
          bestPrior = Math.max(bestPrior, estimateE1RM(set.weight, set.reps))
        }
      }
    }
    if (bestPrior === 0) {
      // First logged working set for this exercise — not claimed as a PR over invented history.
      continue
    }
    if (nowE1 > bestPrior) {
      prs.push({
        exerciseName: ex.exerciseName,
        detail: `${bestNow.weight} kg × ${bestNow.reps} (est. e1RM ${nowE1} > prior ${bestPrior})`,
        e1rm: nowE1,
      })
    }
  }
  return prs
}

export function buildWorkoutSummaryDetail(params: {
  session: WorkoutSessionRecord
  progressionRecords: ProgressionRecord[]
  historySessions: WorkoutSessionRecord[]
  profile: GymProfile | null
}): WorkoutSummaryDetail {
  const { session, progressionRecords, historySessions, profile } = params
  const assumptions: string[] = []
  const withThis = [session, ...filterCompletedSessionRecords(historySessions)]
  const volume = computeMuscleVolumeFromSessions(withThis, false)
  const volumeByMuscle = volume
    .filter(v => v.directSets > 0)
    .map(v => ({
      muscle: v.muscle,
      label: MUSCLE_GROUP_LABELS[v.muscle] ?? v.muscle,
      sets: v.directSets,
    }))

  if (volumeByMuscle.length === 0) {
    assumptions.push('No completed working sets mapped to muscles — volume by muscle unavailable.')
  }

  const muscles = new Set<string>()
  for (const ex of session.exercises) {
    if (ex.skipped) continue
    const contrib = muscleContributionForExercise(ex.exerciseId)
    if (contrib) {
      muscles.add(MUSCLE_GROUP_LABELS[contrib.primary] ?? contrib.primary)
    } else {
      assumptions.push(`Unknown library mapping for ${ex.exerciseName} — excluded from muscle totals.`)
    }
  }

  const prs = detectSessionPRs(session, historySessions)
  if (prs.length === 0) {
    assumptions.push('No PRs claimed without prior completed history for that exercise.')
  }

  const fatigueProxy = Math.min(100, (session.exercises.flatMap(e => e.sets).filter(s => s.completed).length) * 6)
  const recoveryPrediction = fatigueProxy >= 70
    ? 'Expect elevated recovery need — prioritise sleep and avoid stacking the same muscle tomorrow.'
    : fatigueProxy >= 40
      ? 'Moderate recovery demand — you can train a different emphasis tomorrow if sleep is solid.'
      : 'Light session load — recovery should be quick if nutrition and sleep are on track.'

  if (!profile) {
    assumptions.push('No gym profile on file — load increments and progression used defaults.')
  }

  const nextAdvice = progressionRecords[0]?.recommendation
    ?? 'Log another completed session to refine next-session loads.'
  const suggestedNextSession = progressionRecords.length
    ? `Next session: follow progression notes — ${progressionRecords.slice(0, 2).map(p => `${p.exerciseName}: ${p.action}`).join('; ')}.`
    : nextAdvice

  const summaryText = [
    `Completed ${session.title}`,
    `${session.totalVolumeKg ?? 0} kg volume`,
    `${session.adherenceScore ?? 0}% adherence`,
    prs.length ? `${prs.length} PR(s)` : 'No PRs vs prior history',
    progressionRecords[0] ? progressionRecords[0].recommendation : '',
  ].filter(Boolean).join(' · ')

  return {
    summaryText,
    volumeByMuscle,
    progression: progressionRecords.map(p => ({
      exerciseName: p.exerciseName,
      action: p.action,
      recommendation: p.recommendation,
    })),
    recoveryPrediction,
    prs,
    adherenceScore: session.adherenceScore ?? 0,
    musclesTrained: [...muscles],
    suggestedNextSession,
    assumptions,
    durationMinutes: session.durationMinutes ?? 0,
    totalVolumeKg: session.totalVolumeKg ?? 0,
  }
}

