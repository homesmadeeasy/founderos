import type { WorkoutSession } from './gymTypes'
import type { WorkoutSessionRecord } from './gymStorage/gymStorageTypes'
import { sessionRecordToWorkoutSession } from './gymStorage/gymWorkoutService'
import { parseWorkoutSessions } from './gymWorkoutLogger'
import type { GymInput } from './gymTypes'
import {
  filterCompletedSessionRecords,
  isCompletedWorkoutSession,
} from './gymSessionStatus'

/**
 * Structured completed sessions only — never Planned / Skipped / Cancelled / In Progress.
 * Legacy parsed sessions are included only when they claim completed === true.
 */
export function mergeWorkoutSessions(
  input: GymInput,
  structured: WorkoutSessionRecord[],
): WorkoutSession[] {
  const legacy = parseWorkoutSessions(input).filter(s => s.completed === true)
  const structuredConverted = filterCompletedSessionRecords(structured)
    .map(sessionRecordToWorkoutSession)

  const byId = new Map<string, WorkoutSession>()
  for (const s of legacy) {
    byId.set(s.id, s)
  }
  for (const s of structuredConverted) {
    byId.set(s.id, s)
  }

  return [...byId.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50)
}

/** True only when at least one Completed session has real logged working sets. */
export function hasStructuredHistory(sessions: WorkoutSessionRecord[]): boolean {
  return sessions.some(s =>
    isCompletedWorkoutSession(s) && s.source === 'gym_logger' &&
    s.exercises.some(e => e.sets.some(set => set.completed && set.setType === 'working')),
  )
}

/** Completed sessions only — for checklist / volume / progression callers. */
export function completedStructuredSessions(
  sessions: WorkoutSessionRecord[],
): WorkoutSessionRecord[] {
  return filterCompletedSessionRecords(sessions)
}
