import type {
  ApprovedWorkoutPlan,
  GymProfile,
  WorkoutSessionRecord,
  WorkoutSkipReason,
} from './gymStorage/gymStorageTypes'
import { newGymId } from './gymStorage/gymStorageRepository'
import {
  calendarDateISO,
  nextAvailableTrainingDay,
  type WorkoutSessionStatus,
} from './gymSessionStatus'
import { nowISO } from '@/lib/conversation/conversationUtils'

export function createPlannedWorkoutSession(input: {
  plan?: ApprovedWorkoutPlan | null
  title: string
  scheduledFor: string
  exercises?: WorkoutSessionRecord['exercises']
  notes?: string
}): WorkoutSessionRecord {
  const now = nowISO()
  const day = input.scheduledFor.slice(0, 10)
  return {
    id: newGymId(),
    date: `${day}T12:00:00.000Z`,
    scheduledFor: day,
    startedAt: now,
    completedAt: '',
    updatedAt: now,
    title: input.title,
    exercises: input.exercises ?? (input.plan?.exercises.map((ex, i) => ({
      plannedExerciseId: ex.plannedExerciseId,
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      order: i + 1,
      sets: [],
      notes: '',
    })) ?? []),
    completed: false,
    status: 'planned',
    sessionNotes: input.notes,
    painFlags: [],
    source: 'gym_logger',
  }
}

/**
 * Create a planned session for tomorrow. Today remains Not Started (no fabricated session).
 */
export function scheduleFirstSessionTomorrow(input: {
  title: string
  plan?: ApprovedWorkoutPlan | null
}): { planned: WorkoutSessionRecord } {
  const tomorrow = calendarDateISO(new Date(Date.now() + 86400000))
  const planned = createPlannedWorkoutSession({
    plan: input.plan,
    title: input.title,
    scheduledFor: tomorrow,
    notes: 'First session — planned. No sets logged yet; this is not completed work.',
  })
  return { planned }
}

export function skipWorkoutSession(input: {
  session?: WorkoutSessionRecord | null
  title: string
  reason: WorkoutSkipReason
  note?: string
  profile: GymProfile | null
  offerReschedule?: boolean
}): { skipped: WorkoutSessionRecord; rescheduled: WorkoutSessionRecord | null } {
  const now = nowISO()
  const today = calendarDateISO()
  const base = input.session ?? createPlannedWorkoutSession({
    title: input.title,
    scheduledFor: today,
  })

  const skipped: WorkoutSessionRecord = {
    ...base,
    id: base.id || newGymId(),
    updatedAt: now,
    completed: false,
    status: 'skipped',
    skipReason: input.reason,
    skipNote: input.note,
    completedAt: '',
    exercises: [],
    totalVolumeKg: 0,
    adherenceScore: 0,
    painFlags: [],
  }

  let rescheduled: WorkoutSessionRecord | null = null
  if (input.offerReschedule !== false) {
    const nextDay = nextAvailableTrainingDay(
      today,
      input.profile?.trainingDaysPerWeek ?? 3,
    )
    rescheduled = createPlannedWorkoutSession({
      title: input.title,
      scheduledFor: nextDay,
      notes: `Rescheduled after skip (${input.reason}).`,
    })
    rescheduled.rescheduledFromId = skipped.id
    skipped.rescheduledTo = nextDay
  }

  return { skipped, rescheduled }
}

export function markSessionStatus(
  session: WorkoutSessionRecord,
  status: WorkoutSessionStatus,
): WorkoutSessionRecord {
  return {
    ...session,
    status,
    completed: status === 'completed',
    updatedAt: nowISO(),
  }
}
