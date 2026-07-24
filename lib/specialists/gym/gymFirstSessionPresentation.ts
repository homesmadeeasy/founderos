/**
 * First-session / deferred-tomorrow presentation helpers.
 * Pure functions — safe for unit tests without React.
 */
import type {
  FirstSessionIntent,
  GymProfile,
  WorkoutSessionRecord,
} from './gymStorage/gymStorageTypes'
import {
  addDaysISO,
  calendarDateISO,
  isCompletedWorkoutSession,
  todayWorkoutCalendarStatus,
  type WorkoutSessionStatus,
} from './gymSessionStatus'

export type WorkoutCardMode =
  | 'resume'
  | 'today_actionable'
  | 'planned_tomorrow'
  | 'terminal'

export interface WorkoutCardPresentation {
  mode: WorkoutCardMode
  /** Card eyebrow label */
  heading: string
  /** Short status chip */
  statusLabel: string
  /** Why start controls are hidden / shown */
  reason: string
  showApprove: boolean
  showStart: boolean
  showSkip: boolean
  showResume: boolean
  showStartTodayInstead: boolean
  showKeepForTomorrow: boolean
  showChangeSchedule: boolean
}

export interface ResolveFirstSessionIntentResult {
  /** Effective intent after safe migration */
  intent: FirstSessionIntent | undefined
  /** Apply via saveProfile when present */
  profilePatch: Partial<GymProfile> | null
  migrated: boolean
}

/**
 * Safe migration for profiles stuck on firstSessionIntent = tomorrow.
 * Uses the user's local calendar date (calendarDateISO).
 *
 * - If a planned session is already due today or overdue → treat as today.
 * - If any completed workout exists → clear deferred intent.
 * - Otherwise keep tomorrow (honest deferred state).
 */
export function resolveFirstSessionIntent(
  profile: Pick<GymProfile, 'firstSessionIntent'> | null | undefined,
  sessions: WorkoutSessionRecord[],
  todayISO: string = calendarDateISO(),
): ResolveFirstSessionIntentResult {
  const intent = profile?.firstSessionIntent
  if (intent !== 'tomorrow') {
    return { intent, profilePatch: null, migrated: false }
  }

  if (sessions.some(isCompletedWorkoutSession)) {
    return {
      intent: 'today',
      profilePatch: { firstSessionIntent: 'today' },
      migrated: true,
    }
  }

  const dueOrOverduePlanned = sessions.some(s => {
    if (s.status !== 'planned') return false
    const day = (s.scheduledFor ?? s.date).slice(0, 10)
    return day <= todayISO.slice(0, 10)
  })

  if (dueOrOverduePlanned) {
    return {
      intent: 'today',
      profilePatch: { firstSessionIntent: 'today' },
      migrated: true,
    }
  }

  return { intent: 'tomorrow', profilePatch: null, migrated: false }
}

export function isDeferredFirstSessionTomorrow(
  profile: Pick<GymProfile, 'firstSessionIntent'> | null | undefined,
  sessions: WorkoutSessionRecord[],
  todayISO: string = calendarDateISO(),
  todayStatus: { status: WorkoutSessionStatus | 'not_started'; label: string } = todayWorkoutCalendarStatus(sessions, todayISO),
): boolean {
  const resolved = resolveFirstSessionIntent(profile, sessions, todayISO)
  return (
    resolved.intent === 'tomorrow'
    && todayStatus.status === 'not_started'
    && !sessions.some(s => {
      const day = (s.scheduledFor ?? s.date).slice(0, 10)
      return day === todayISO.slice(0, 10) && (s.status === 'in_progress' || s.status === 'paused')
    })
  )
}

export function buildWorkoutCardPresentation(input: {
  profile: Pick<GymProfile, 'firstSessionIntent'> | null | undefined
  sessions: WorkoutSessionRecord[]
  todayStatus: { status: WorkoutSessionStatus | 'not_started'; label: string }
  hasActiveWorkout: boolean
  todayISO?: string
}): WorkoutCardPresentation {
  const todayISO = input.todayISO ?? calendarDateISO()
  const { todayStatus, hasActiveWorkout } = input

  if (hasActiveWorkout) {
    return {
      mode: 'resume',
      heading: "Today's workout",
      statusLabel: todayStatus.status === 'paused' ? 'Paused' : 'In Progress',
      reason: 'Active session exists — resume only',
      showApprove: false,
      showStart: false,
      showSkip: false,
      showResume: true,
      showStartTodayInstead: false,
      showKeepForTomorrow: false,
      showChangeSchedule: false,
    }
  }

  if (todayStatus.status === 'completed' || todayStatus.status === 'skipped') {
    return {
      mode: 'terminal',
      heading: "Today's workout",
      statusLabel: todayStatus.label,
      reason: 'Session already completed or skipped',
      showApprove: false,
      showStart: false,
      showSkip: false,
      showResume: false,
      showStartTodayInstead: false,
      showKeepForTomorrow: false,
      showChangeSchedule: false,
    }
  }

  if (isDeferredFirstSessionTomorrow(input.profile, input.sessions, todayISO, todayStatus)) {
    return {
      mode: 'planned_tomorrow',
      heading: 'Planned for tomorrow',
      statusLabel: 'Planned',
      reason: 'First session deferred — not an actionable today workout',
      showApprove: false,
      showStart: false,
      showSkip: false,
      showResume: false,
      showStartTodayInstead: true,
      showKeepForTomorrow: true,
      showChangeSchedule: true,
    }
  }

  return {
    mode: 'today_actionable',
    heading: "Today's workout",
    statusLabel: todayStatus.status === 'not_started' ? 'Not Started' : todayStatus.label,
    reason: 'Scheduled for today — standard approve/start/skip',
    showApprove: true,
    showStart: true,
    showSkip: true,
    showResume: false,
    showStartTodayInstead: false,
    showKeepForTomorrow: false,
    showChangeSchedule: false,
  }
}

/**
 * Cancel deferred tomorrow planned sessions (no completed sets invented).
 * Returns updated session list + cancelled ids.
 */
export function cancelDeferredTomorrowSessions(
  sessions: WorkoutSessionRecord[],
  todayISO: string = calendarDateISO(),
  now: string = new Date().toISOString(),
): { sessions: WorkoutSessionRecord[]; cancelledIds: string[] } {
  const tomorrow = addDaysISO(todayISO, 1)
  const cancelledIds: string[] = []
  const next = sessions.map(s => {
    const day = (s.scheduledFor ?? s.date).slice(0, 10)
    if (day === tomorrow && s.status === 'planned') {
      cancelledIds.push(s.id)
      return {
        ...s,
        status: 'cancelled' as const,
        completed: false,
        completedAt: '',
        updatedAt: now,
        exercises: s.exercises.map(ex => ({ ...ex, sets: [] })),
        totalVolumeKg: 0,
        sessionNotes: [s.sessionNotes, 'Cancelled — started first session today instead.']
          .filter(Boolean)
          .join(' '),
      }
    }
    return s
  })
  return { sessions: next, cancelledIds }
}

export function keepForTomorrowCreatesNoHistory(
  sessionsBefore: WorkoutSessionRecord[],
  sessionsAfter: WorkoutSessionRecord[],
): boolean {
  const completedBefore = sessionsBefore.filter(isCompletedWorkoutSession).length
  const completedAfter = sessionsAfter.filter(isCompletedWorkoutSession).length
  return completedBefore === completedAfter
}
