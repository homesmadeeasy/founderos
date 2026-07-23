import type {
  ActiveWorkout,
  ExercisePerformanceRecord,
  ExerciseSkipReason,
  GymProfile,
  SessionEnergyAfter,
  SetPerformanceRecord,
  WorkoutSessionRecord,
} from './gymStorageTypes'
import type { ApprovedWorkoutPlan } from './gymStorageTypes'
import type { GymSnapshot, PlannedExercise } from '../gymTypes'
import { getGymStorageRepository, newGymId } from './gymStorageRepository'
import { totalSessionVolumeKg } from './gymMuscleMapping'
import { computeDoubleProgression, buildProgressionRecord } from './gymDoubleProgression'
import { nowISO } from '@/lib/conversation/conversationUtils'
import { calendarDateISO } from '../gymSessionStatus'
import { buildWorkoutLogMemory } from '../gymWorkoutLogger'
import {
  buildPlannedExerciseInstanceId,
  normalizeActiveWorkoutExercises,
  normalizeApprovedPlanExercises,
} from '../gymPlannedExerciseUtils'
import { buildWorkoutSummaryDetail, type WorkoutSummaryDetail } from '../gymActiveWorkoutEngine'
import { getExerciseById, GYM_EXERCISE_LIBRARY } from '../gymExerciseLibrary'
import { exerciseKey as buildExerciseKey } from '../gymActiveWorkoutEngine'

export interface CompleteWorkoutResult {
  session: WorkoutSessionRecord
  summary: string
  summaryDetail: WorkoutSummaryDetail
  progressionRecords: ReturnType<typeof buildProgressionRecord>[]
  memoryTitle: string
  memoryContent: string
  prs: WorkoutSummaryDetail['prs']
}

export function createActiveWorkoutFromPlan(
  plan: ApprovedWorkoutPlan,
  snapshotTitle: string,
): ActiveWorkout {
  const now = nowISO()
  const workoutId = newGymId()
  const normalisedPlan = {
    ...plan,
    exercises: normalizeApprovedPlanExercises(
      plan.exercises,
      plan.workoutInstanceId ?? plan.id,
    ),
  }
  const exercises = normalisedPlan.exercises.map((ex, i) => ({
    plannedExerciseId: ex.plannedExerciseId
      ?? buildPlannedExerciseInstanceId(workoutId, ex.exerciseId, i + 1),
    exerciseId: ex.exerciseId,
    exerciseName: ex.exerciseName,
    order: i + 1,
    sets: Array.from({ length: ex.sets }, (_, si) => ({
      id: newGymId(),
      setNumber: si + 1,
      setType: 'working' as const,
      reps: ex.targetReps,
      weight: ex.suggestedLoadKg ?? 0,
      rpe: ex.targetRpe,
      rir: ex.targetRir,
      completed: false,
    })),
    notes: '',
    originalPrescription: {
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      sets: ex.sets,
      repRange: ex.repRange,
      targetReps: ex.targetReps,
      targetRpe: ex.targetRpe,
      targetRir: ex.targetRir,
      suggestedLoadKg: ex.suggestedLoadKg,
    },
  }))
  return {
    id: workoutId,
    startedAt: now,
    updatedAt: now,
    status: 'active' as const,
    title: plan.title,
    basedOnSnapshotTitle: snapshotTitle,
    approvedAt: plan.approvedAt,
    sessionNotes: '',
    persistStatus: 'saved' as const,
    exercises: normalizeActiveWorkoutExercises(exercises, workoutId),
  }
}

/** Starting is idempotent: an existing active workout always wins. */
export function createOrResumeActiveWorkoutFromPlan(
  plan: ApprovedWorkoutPlan,
  current: ActiveWorkout | null,
): ActiveWorkout {
  return current ?? createActiveWorkoutFromPlan(plan, plan.title)
}

export function createActiveWorkoutFromSnapshot(snapshot: GymSnapshot): ActiveWorkout {
  const now = nowISO()
  const workoutId = newGymId()
  const exercises = snapshot.todaysWorkout.exercises.map((ex: PlannedExercise, i: number) => ({
    plannedExerciseId: ex.plannedExerciseId
      || buildPlannedExerciseInstanceId(workoutId, ex.exerciseId, i + 1),
    exerciseId: ex.exerciseId,
    exerciseName: ex.exerciseName,
    order: i + 1,
    sets: Array.from({ length: ex.sets }, (_, si) => ({
      id: newGymId(),
      setNumber: si + 1,
      setType: 'working' as const,
      reps: parseInt(ex.reps, 10) || ex.prescription.targetReps,
      weight: 0,
      rpe: ex.targetRpe,
      completed: false,
    })),
    notes: '',
  }))
  return {
    id: workoutId,
    startedAt: now,
    updatedAt: now,
    status: 'active',
    title: snapshot.todaysWorkout.title,
    basedOnSnapshotTitle: snapshot.todaysWorkout.title,
    sessionNotes: '',
    exercises: normalizeActiveWorkoutExercises(exercises, workoutId),
  }
}

function matchesExercise(ex: ExercisePerformanceRecord, key: string): boolean {
  return (ex.plannedExerciseId ?? ex.exerciseId) === key || ex.exerciseId === key
}

export function addSetToExercise(
  workout: ActiveWorkout,
  exerciseKey: string,
  setType: 'warmup' | 'working' = 'working',
): ActiveWorkout {
  return {
    ...workout,
    updatedAt: nowISO(),
    exercises: workout.exercises.map(ex => {
      if (!matchesExercise(ex, exerciseKey)) return ex
      const last = ex.sets[ex.sets.length - 1]
      const newSet: SetPerformanceRecord = {
        id: newGymId(),
        setNumber: ex.sets.length + 1,
        setType,
        reps: last?.reps ?? 8,
        weight: last?.weight ?? 0,
        rpe: last?.rpe,
        rir: last?.rir,
        completed: false,
      }
      return { ...ex, sets: [...ex.sets, newSet] }
    }),
  }
}

export function updateSet(
  workout: ActiveWorkout,
  exerciseKey: string,
  setId: string,
  patch: Partial<SetPerformanceRecord>,
): ActiveWorkout {
  return {
    ...workout,
    updatedAt: nowISO(),
    exercises: workout.exercises.map(ex => {
      if (!matchesExercise(ex, exerciseKey)) return ex
      return {
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, ...patch } : s),
      }
    }),
  }
}

export function removeSet(workout: ActiveWorkout, exerciseKey: string, setId: string): ActiveWorkout {
  return {
    ...workout,
    updatedAt: nowISO(),
    exercises: workout.exercises.map(ex => {
      if (!matchesExercise(ex, exerciseKey)) return ex
      const sets = ex.sets.filter(s => s.id !== setId).map((s, i) => ({ ...s, setNumber: i + 1 }))
      return { ...ex, sets }
    }),
  }
}

/** Remaining rest from an absolute end timestamp (background-safe). */
export function remainingRestMs(
  endsAt: string | null | undefined,
  nowMs: number = Date.now(),
): number {
  if (!endsAt) return 0
  const ends = Date.parse(endsAt)
  if (!Number.isFinite(ends)) return 0
  return Math.max(0, ends - nowMs)
}

export function pauseActiveWorkout(workout: ActiveWorkout): ActiveWorkout {
  const remaining = remainingRestMs(workout.restTimerEndsAt)
  return {
    ...workout,
    status: 'paused',
    pausedRestRemainingMs: remaining > 0 ? remaining : null,
    restTimerEndsAt: null,
    updatedAt: nowISO(),
  }
}

export function resumeActiveWorkout(workout: ActiveWorkout): ActiveWorkout {
  const remaining = workout.pausedRestRemainingMs
  return {
    ...workout,
    status: 'active',
    restTimerEndsAt: remaining != null && remaining > 0
      ? new Date(Date.now() + remaining).toISOString()
      : null,
    pausedRestRemainingMs: null,
    updatedAt: nowISO(),
  }
}

export function skipExerciseInWorkout(
  workout: ActiveWorkout,
  exerciseKey: string,
  reason?: ExerciseSkipReason,
): ActiveWorkout {
  return {
    ...workout,
    updatedAt: nowISO(),
    restTimerEndsAt: null,
    currentExerciseKey: null,
    exercises: workout.exercises.map(ex =>
      matchesExercise(ex, exerciseKey)
        ? { ...ex, skipped: true, skipReason: reason, finished: true }
        : ex,
    ),
  }
}

export function finishExerciseInWorkout(workout: ActiveWorkout, exerciseKey: string): ActiveWorkout {
  return {
    ...workout,
    updatedAt: nowISO(),
    restTimerEndsAt: null,
    currentExerciseKey: null,
    exercises: workout.exercises.map(ex => {
      if (!matchesExercise(ex, exerciseKey)) return ex
      // Ending an exercise must never turn prescribed target values into logged data.
      return { ...ex, finished: true }
    }),
  }
}

export function validateCompletedSetInput(input: {
  weight: number
  reps: number
  rpe?: number
  rir?: number
}): string | null {
  if (!Number.isFinite(input.weight) || input.weight < 0) return 'Weight must be zero or greater.'
  if (!Number.isInteger(input.reps) || input.reps <= 0) return 'Reps must be a positive whole number.'
  if (input.rpe != null && (!Number.isFinite(input.rpe) || input.rpe < 1 || input.rpe > 10)) {
    return 'RPE must be between 1 and 10.'
  }
  if (input.rir != null && (!Number.isInteger(input.rir) || input.rir < 0 || input.rir > 10)) {
    return 'RIR must be a whole number between 0 and 10.'
  }
  return null
}

export function hasCompletedValidWorkingSet(workout: ActiveWorkout): boolean {
  return workout.exercises.some(ex => !ex.skipped && ex.sets.some(set =>
    set.completed
    && set.setType === 'working'
    && validateCompletedSetInput(set) === null,
  ))
}

export function startRestTimer(workout: ActiveWorkout, restSeconds: number): ActiveWorkout {
  const ends = new Date(Date.now() + Math.max(0, restSeconds) * 1000).toISOString()
  return {
    ...workout,
    restTimerEndsAt: ends,
    pausedRestRemainingMs: null,
    updatedAt: nowISO(),
  }
}

export function clearRestTimer(workout: ActiveWorkout): ActiveWorkout {
  return {
    ...workout,
    restTimerEndsAt: null,
    pausedRestRemainingMs: null,
    updatedAt: nowISO(),
  }
}

/** Add or subtract seconds from an active rest end timestamp. */
export function adjustRestTimer(workout: ActiveWorkout, deltaSeconds: number): ActiveWorkout {
  if (!workout.restTimerEndsAt) return workout
  const nextEnds = Date.parse(workout.restTimerEndsAt) + deltaSeconds * 1000
  if (!Number.isFinite(nextEnds)) return workout
  return {
    ...workout,
    restTimerEndsAt: new Date(Math.max(Date.now(), nextEnds)).toISOString(),
    updatedAt: nowISO(),
  }
}

export function focusExercise(workout: ActiveWorkout, exerciseKeyValue: string): ActiveWorkout {
  return {
    ...workout,
    currentExerciseKey: exerciseKeyValue,
    updatedAt: nowISO(),
  }
}

export function applySuggestedLoadToNextSet(
  workout: ActiveWorkout,
  exerciseKey: string,
  weight: number,
): ActiveWorkout {
  return {
    ...workout,
    updatedAt: nowISO(),
    exercises: workout.exercises.map(ex => {
      if (!matchesExercise(ex, exerciseKey)) return ex
      let applied = false
      return {
        ...ex,
        sets: ex.sets.map(s => {
          if (applied || s.completed) return s
          applied = true
          return { ...s, weight }
        }),
      }
    }),
  }
}

export function completeWorkout(
  workout: ActiveWorkout,
  profile: GymProfile | null,
  existingSessions: WorkoutSessionRecord[],
  review?: PostWorkoutReview,
): CompleteWorkoutResult {
  const completedAt = nowISO()
  const session: WorkoutSessionRecord = {
    id: workout.id,
    date: completedAt,
    scheduledFor: calendarDateISO(new Date(completedAt)),
    startedAt: workout.startedAt,
    completedAt,
    updatedAt: completedAt,
    title: workout.title,
    exercises: workout.exercises.filter(e => !e.skipped),
    durationMinutes: Math.round((Date.parse(completedAt) - Date.parse(workout.startedAt)) / 60000),
    completed: true,
    status: 'completed',
    sessionNotes: review?.sessionNotes?.trim() || workout.sessionNotes,
    painFlags: workout.exercises.flatMap(e =>
      e.sets.filter(s => s.painFlag).map(() => `${e.exerciseName}: discomfort reported`),
    ),
    adherenceScore: computeAdherence(workout),
    totalVolumeKg: 0,
    source: 'gym_logger',
    sessionRpe: review?.sessionRpe,
    energyAfter: review?.energyAfter,
    discomfortReported: review?.discomfortReported,
    bodyweightKg: review?.bodyweightKg,
  }
  session.totalVolumeKg = totalSessionVolumeKg(session)

  const progressionRecords = session.exercises.map(ex => {
    const targetRange = ex.sets[0] ? `${Math.min(...ex.sets.map(s => s.reps))}-${Math.max(...ex.sets.map(s => s.reps))}` : '8-10'
    const result = computeDoubleProgression({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      sessions: [session, ...existingSessions],
      targetRepRange: targetRange,
      profile,
      painBlocked: session.painFlags.length > 0,
    })
    return buildProgressionRecord({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      sessions: [session, ...existingSessions],
      targetRepRange: targetRange,
      profile,
    }, result)
  })

  const summaryDetail = buildWorkoutSummaryDetail({
    session,
    progressionRecords,
    historySessions: existingSessions,
    profile,
  })

  const summary = summaryDetail.summaryText

  const mem = buildWorkoutLogMemory({
    exercises: session.exercises.map(e => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      sets: e.sets.filter(s => s.completed).map(s => ({
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        rpe: s.rpe,
        completed: true,
      })),
    })),
    notes: summary,
  })

  return {
    session,
    summary,
    summaryDetail,
    progressionRecords,
    memoryTitle: mem.title,
    memoryContent: mem.content,
    prs: summaryDetail.prs,
  }
}

export interface PostWorkoutReview {
  sessionRpe?: number
  energyAfter?: SessionEnergyAfter
  discomfortReported?: boolean
  bodyweightKg?: number
  sessionNotes?: string
}

/** Compatible substitutes share the same movement pattern. */
export function listCompatibleSubstitutes(exerciseId: string) {
  const source = getExerciseById(exerciseId)
  if (!source) return []
  return GYM_EXERCISE_LIBRARY.filter(e =>
    e.id !== exerciseId && e.movementPattern === source.movementPattern,
  )
}

export function substituteExercise(
  workout: ActiveWorkout,
  exerciseKeyValue: string,
  replacementExerciseId: string,
): ActiveWorkout {
  const replacement = getExerciseById(replacementExerciseId)
  if (!replacement) return workout
  return {
    ...workout,
    updatedAt: nowISO(),
    exercises: workout.exercises.map(ex => {
      if (!matchesExercise(ex, exerciseKeyValue)) return ex
      const original = ex.originalPrescription ?? {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets.filter(s => s.setType === 'working').length,
        repRange: replacement.repRange,
        targetReps: Number.parseInt(replacement.repRange, 10) || 8,
      }
      return {
        ...ex,
        substitutedFromId: ex.substitutedFromId ?? ex.exerciseId,
        exerciseId: replacement.id,
        exerciseName: replacement.name,
        originalPrescription: original,
      }
    }),
  }
}

export function reorderExercise(
  workout: ActiveWorkout,
  exerciseKeyValue: string,
  direction: 'up' | 'down',
): ActiveWorkout {
  const sorted = [...workout.exercises].sort((a, b) => a.order - b.order)
  const idx = sorted.findIndex(ex => matchesExercise(ex, exerciseKeyValue))
  if (idx < 0) return workout
  const swapWith = direction === 'up' ? idx - 1 : idx + 1
  if (swapWith < 0 || swapWith >= sorted.length) return workout
  // Only reorder among exercises that are still open.
  if (sorted[idx].skipped || sorted[idx].finished) return workout
  if (sorted[swapWith].skipped || sorted[swapWith].finished) return workout
  const a = sorted[idx]
  const b = sorted[swapWith]
  const aOrder = a.order
  const nextList = workout.exercises.map(ex => {
    if (matchesExercise(ex, buildExerciseKey(a))) return { ...ex, order: b.order }
    if (matchesExercise(ex, buildExerciseKey(b))) return { ...ex, order: aOrder }
    return ex
  })
  return {
    ...workout,
    updatedAt: nowISO(),
    exercises: normalizeActiveWorkoutExercises(
      nextList.sort((x, y) => x.order - y.order),
      workout.id,
    ),
  }
}

export function addExerciseToWorkout(
  workout: ActiveWorkout,
  exerciseId: string,
): ActiveWorkout {
  const lib = getExerciseById(exerciseId)
  if (!lib) return workout
  if (workout.exercises.length >= 24) return workout
  const order = workout.exercises.reduce((max, ex) => Math.max(max, ex.order), 0) + 1
  const targetReps = Number.parseInt(lib.repRange, 10) || 8
  const added: ExercisePerformanceRecord = {
    plannedExerciseId: buildPlannedExerciseInstanceId(workout.id, lib.id, order),
    exerciseId: lib.id,
    exerciseName: lib.name,
    order,
    sets: Array.from({ length: 3 }, (_, si) => ({
      id: newGymId(),
      setNumber: si + 1,
      setType: 'working' as const,
      reps: targetReps,
      weight: 0,
      completed: false,
    })),
    notes: '',
    originalPrescription: {
      exerciseId: lib.id,
      exerciseName: lib.name,
      sets: 3,
      repRange: lib.repRange,
      targetReps,
    },
  }
  return {
    ...workout,
    updatedAt: nowISO(),
    currentExerciseKey: buildExerciseKey(added),
    exercises: normalizeActiveWorkoutExercises([...workout.exercises, added], workout.id),
  }
}

export function toggleSetWarmup(
  workout: ActiveWorkout,
  exerciseKeyValue: string,
  setId: string,
): ActiveWorkout {
  return {
    ...workout,
    updatedAt: nowISO(),
    exercises: workout.exercises.map(ex => {
      if (!matchesExercise(ex, exerciseKeyValue)) return ex
      return {
        ...ex,
        sets: ex.sets.map(s =>
          s.id === setId
            ? { ...s, setType: s.setType === 'warmup' ? 'working' : 'warmup' }
            : s,
        ),
      }
    }),
  }
}

function computeAdherence(workout: ActiveWorkout): number {
  const total = workout.exercises.reduce((n, ex) => n + ex.sets.filter(s => s.setType === 'working').length, 0)
  const done = workout.exercises.reduce((n, ex) => n + ex.sets.filter(s => s.completed && s.setType === 'working').length, 0)
  if (total === 0) return 0
  return Math.round((done / total) * 100)
}

export function sessionRecordToWorkoutSession(record: WorkoutSessionRecord) {
  return {
    id: record.id,
    date: record.completedAt,
    title: record.title,
    exercises: record.exercises.map(e => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      sets: e.sets.map(s => ({
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        rpe: s.rpe,
        rir: s.rir,
        completed: s.completed,
        setType: s.setType,
        painFlag: s.painFlag,
      })),
    })),
    durationMinutes: record.durationMinutes,
    completed: record.completed,
    notes: record.sessionNotes,
    sourceType: 'object' as const,
    sourceId: record.id,
  }
}

export function persistCompletedWorkout(result: CompleteWorkoutResult): void {
  const repo = getGymStorageRepository()
  repo.upsertSession(result.session)
  for (const pr of result.progressionRecords) {
    repo.addProgressionRecord(pr)
  }
  repo.saveActiveWorkout(null)
}
