import type { WorkoutSessionRecord } from './gymStorage/gymStorageTypes'
import type { WorkoutSession } from './gymTypes'

export type WorkoutSessionStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'cancelled'

export type WorkoutSkipReason =
  | 'time'
  | 'illness'
  | 'busy'
  | 'recovery'
  | 'travel'
  | 'other'

export const WORKOUT_STATUS_LABELS: Record<WorkoutSessionStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
}

export const WORKOUT_SKIP_REASON_LABELS: Record<WorkoutSkipReason, string> = {
  time: 'Not enough time',
  illness: 'Illness',
  busy: 'Busy / schedule conflict',
  recovery: 'Recovery / fatigue',
  travel: 'Travel',
  other: 'Other',
}

/** Statuses that must never contribute to volume, progression, PRs, or recovery frequency. */
export const NON_STATISTICAL_STATUSES: ReadonlySet<WorkoutSessionStatus> = new Set([
  'planned',
  'skipped',
  'cancelled',
  'in_progress',
])

export function normalizeWorkoutStatus(
  session: Pick<WorkoutSessionRecord, 'status' | 'completed'>,
): WorkoutSessionStatus {
  if (session.status) return session.status
  return session.completed ? 'completed' : 'planned'
}

/** Only Completed workouts contribute to Gym statistics. */
export function isCompletedWorkoutSession(
  session: Pick<WorkoutSessionRecord, 'status' | 'completed'>,
): boolean {
  return normalizeWorkoutStatus(session) === 'completed'
}

export function filterCompletedSessionRecords(
  sessions: WorkoutSessionRecord[],
): WorkoutSessionRecord[] {
  return sessions.filter(isCompletedWorkoutSession)
}

export function filterCompletedWorkoutSessions(
  sessions: WorkoutSession[],
): WorkoutSession[] {
  return sessions.filter(s => s.completed === true)
}

export function calendarDateISO(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO.slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  return calendarDateISO(d)
}

/**
 * Next available training day after `fromDateISO` (exclusive).
 * Uses preferred days-per-week as a simple every-n-days rhythm when no weekday prefs exist.
 */
export function nextAvailableTrainingDay(
  fromDateISO: string,
  trainingDaysPerWeek: number,
): string {
  const daysBetween = trainingDaysPerWeek >= 6 ? 1
    : trainingDaysPerWeek >= 4 ? 1
      : trainingDaysPerWeek >= 3 ? 1
        : 2
  // Prefer tomorrow at minimum; if only 1–2 days/week, suggest day after tomorrow as soft spacing.
  const offset = trainingDaysPerWeek <= 2 ? 2 : Math.max(1, Math.min(daysBetween, 2))
  return addDaysISO(fromDateISO, offset)
}

export function todayWorkoutCalendarStatus(
  sessions: WorkoutSessionRecord[],
  todayISO: string = calendarDateISO(),
): {
  status: WorkoutSessionStatus | 'not_started'
  session: WorkoutSessionRecord | null
  label: string
} {
  const todaySessions = sessions
    .filter(s => (s.scheduledFor ?? s.date).slice(0, 10) === todayISO.slice(0, 10))
    .sort((a, b) => {
      const aKey = a.updatedAt ?? a.completedAt ?? a.startedAt ?? ''
      const bKey = b.updatedAt ?? b.completedAt ?? b.startedAt ?? ''
      return bKey.localeCompare(aKey)
    })

  const session = todaySessions[0] ?? null
  if (!session) {
    return { status: 'not_started', session: null, label: 'Not Started' }
  }
  const status = normalizeWorkoutStatus(session)
  return { status, session, label: WORKOUT_STATUS_LABELS[status] }
}
