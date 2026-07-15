import { registerActionHandler } from '@/lib/action-engine/actionRegistry'
import type { ActionExecutionContext, ActionExecutionResult } from '@/lib/action-engine/actionTypes'
import {
  buildWorkoutLogMemory,
  buildWorkoutSessionObject,
} from './gymWorkoutLogger'
import { findExerciseByName } from './gymExerciseLibrary'

function buildExerciseSets(reps: number, weight: number, sets: number) {
  return Array.from({ length: sets }, (_, i) => ({
    setNumber: i + 1,
    reps,
    weight,
    completed: true,
  }))
}

async function handleWorkoutLogged(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  const exerciseName = String(payload.exerciseName)
  const weight = Number(payload.weight)
  const reps = Number(payload.reps)
  const sets = Number(payload.sets ?? 3)
  const exercise = findExerciseByName(exerciseName)
  const exerciseId = String(payload.exerciseId ?? exercise?.id ?? `custom-${exerciseName.toLowerCase().replace(/\s+/g, '-')}`)

  const exercises = [{
    exerciseId,
    exerciseName,
    sets: buildExerciseSets(reps, weight, sets),
  }]

  const memInput = buildWorkoutLogMemory({
    exercises,
    notes: typeof payload.notes === 'string' ? payload.notes : undefined,
  })
  const memory = ctx.recordMemory(memInput as Record<string, unknown>)
  const objInput = buildWorkoutSessionObject({
    title: `${exerciseName} — ${sets}×${reps} @ ${weight}kg`,
    exercises,
    notes: typeof payload.notes === 'string' ? payload.notes : undefined,
  })
  const object = ctx.createObject(objInput as Record<string, unknown>)

  const muscle = exercise?.primaryMuscle ?? 'chest'
  const memoryId = memory?.id ?? ''
  const objectId = object?.id ?? ''

  await ctx.publish({
    type: 'MemoryCreated',
    source: meta?.source ?? 'action-engine',
    payload: { memoryId, title: memInput.title },
  })
  if (objectId) {
    await ctx.publish({
      type: 'ObjectCreated',
      source: meta?.source ?? 'action-engine',
      payload: { objectId, type: 'workout' },
    })
  }
  await ctx.publish({
    type: 'WorkoutLogged',
    source: meta?.source ?? 'action-engine',
    payload: { exerciseName, weight, reps, sets, memoryId, objectId, muscle },
  })
  await ctx.publish({
    type: 'WeeklyVolumeUpdated',
    source: meta?.source ?? 'action-engine',
    payload: { muscle, exerciseName },
  })

  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: 'WorkoutLogged',
    createdIds: { memoryId, objectId },
  }
}

async function handleWorkoutCompleted(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  const title = String(payload.title ?? 'Workout completed')
  const memory = ctx.recordMemory({
    type: 'health_log',
    title,
    content: title,
    importance: 'medium',
    area: 'health',
    source: 'manual',
    relatedObjectIds: [],
    tags: ['gym', 'workout'],
  })
  await ctx.publish({
    type: 'WorkoutCompleted',
    source: meta?.source ?? 'action-engine',
    payload: { title, memoryId: memory?.id },
  })
  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: 'WorkoutCompleted',
    createdIds: { memoryId: memory?.id ?? '' },
  }
}

async function handleRecoveryUpdated(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  await ctx.publish({
    type: 'RecoveryUpdated',
    source: meta?.source ?? 'action-engine',
    payload: {
      status: payload.status,
      score: payload.score,
      rationale: payload.rationale,
    },
  })
  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: 'RecoveryUpdated',
  }
}

async function handleRoutineGenerated(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  await ctx.publish({
    type: 'RoutineGenerated',
    source: meta?.source ?? 'action-engine',
    payload: { title: payload.title, exerciseCount: payload.exerciseCount },
  })
  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: 'RoutineGenerated',
  }
}

export function registerGymActionHandlers(): void {
  registerActionHandler('WorkoutLogged', handleWorkoutLogged)
  registerActionHandler('WorkoutCompleted', handleWorkoutCompleted)
  registerActionHandler('RecoveryUpdated', handleRecoveryUpdated)
  registerActionHandler('RoutineGenerated', handleRoutineGenerated)
}
