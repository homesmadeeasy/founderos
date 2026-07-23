import type { ActiveWorkout, ExercisePerformanceRecord, GymProfile, SetPerformanceRecord, WorkoutSessionRecord } from './gymStorageTypes'
import type { ApprovedWorkoutPlan } from './gymStorageTypes'
import type { GymSnapshot, PlannedExercise } from '../gymTypes'
import { getGymStorageRepository, newGymId } from './gymStorageRepository'
import { totalSessionVolumeKg } from './gymMuscleMapping'
import { computeDoubleProgression, buildProgressionRecord } from './gymDoubleProgression'
import { nowISO } from '@/lib/conversation/conversationUtils'
import { buildWorkoutLogMemory } from '../gymWorkoutLogger'
import {
  buildPlannedExerciseInstanceId,
  normalizeActiveWorkoutExercises,
  normalizeApprovedPlanExercises,
} from '../gymPlannedExerciseUtils'
import { buildWorkoutSummaryDetail, type WorkoutSummaryDetail } from '../gymActiveWorkoutEngine'

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
  }))
  return {
    id: workoutId,
    startedAt: now,
    updatedAt: now,
    status: 'active',
    title: plan.title,
    basedOnSnapshotTitle: snapshotTitle,
    approvedAt: plan.approvedAt,
    sessionNotes: '',
    exercises: normalizeActiveWorkoutExercises(exercises, workoutId),
  }
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

export function pauseActiveWorkout(workout: ActiveWorkout): ActiveWorkout {
  return {
    ...workout,
    status: 'paused',
    restTimerEndsAt: null,
    updatedAt: nowISO(),
  }
}

export function resumeActiveWorkout(workout: ActiveWorkout): ActiveWorkout {
  return {
    ...workout,
    status: 'active',
    updatedAt: nowISO(),
  }
}

export function skipExerciseInWorkout(workout: ActiveWorkout, exerciseKey: string): ActiveWorkout {
  return {
    ...workout,
    updatedAt: nowISO(),
    restTimerEndsAt: null,
    exercises: workout.exercises.map(ex =>
      matchesExercise(ex, exerciseKey) ? { ...ex, skipped: true } : ex,
    ),
  }
}

export function finishExerciseInWorkout(workout: ActiveWorkout, exerciseKey: string): ActiveWorkout {
  return {
    ...workout,
    updatedAt: nowISO(),
    restTimerEndsAt: null,
    exercises: workout.exercises.map(ex => {
      if (!matchesExercise(ex, exerciseKey)) return ex
      return {
        ...ex,
        sets: ex.sets.map(s => (s.completed ? s : { ...s, completed: true })),
      }
    }),
  }
}

export function startRestTimer(workout: ActiveWorkout, restSeconds: number): ActiveWorkout {
  const ends = new Date(Date.now() + Math.max(0, restSeconds) * 1000).toISOString()
  return {
    ...workout,
    restTimerEndsAt: ends,
    updatedAt: nowISO(),
  }
}

export function clearRestTimer(workout: ActiveWorkout): ActiveWorkout {
  return {
    ...workout,
    restTimerEndsAt: null,
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
): CompleteWorkoutResult {
  const completedAt = nowISO()
  const session: WorkoutSessionRecord = {
    id: workout.id,
    date: completedAt,
    scheduledFor: completedAt.slice(0, 10),
    startedAt: workout.startedAt,
    completedAt,
    updatedAt: completedAt,
    title: workout.title,
    exercises: workout.exercises.filter(e => !e.skipped),
    durationMinutes: Math.round((Date.parse(completedAt) - Date.parse(workout.startedAt)) / 60000),
    completed: true,
    status: 'completed',
    sessionNotes: workout.sessionNotes,
    painFlags: workout.exercises.flatMap(e =>
      e.sets.filter(s => s.painFlag).map(() => `${e.exerciseName}: discomfort reported`),
    ),
    adherenceScore: computeAdherence(workout),
    totalVolumeKg: 0,
    source: 'gym_logger',
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

  const lines = session.exercises.map(ex => {
    const working = ex.sets.filter(s => s.completed && s.setType === 'working')
    const setStr = working.map(s => `${s.weight}kg×${s.reps}`).join(', ')
    return `${ex.exerciseName}: ${setStr || 'no working sets'}`
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
