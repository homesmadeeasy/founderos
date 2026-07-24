'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  ActiveWorkout,
  ApprovedWorkoutPlan,
  FirstSessionIntent,
  GymProfile,
  ProgressionRecord,
  WorkoutSessionRecord,
  WorkoutSkipReason,
} from '@/lib/specialists/gym/gymStorage/gymStorageTypes'
import {
  getGymStorageRepository,
} from '@/lib/specialists/gym/gymStorage/gymStorageRepository'
import {
  isGymOnboardingComplete,
  isProfileComplete,
  validateProfile,
} from '@/lib/specialists/gym/gymStorage/gymStorageSchema'
import { createDefaultGymProfile } from '@/lib/specialists/gym/gymProfileUtils'
import {
  completeWorkout,
  createOrResumeActiveWorkoutFromPlan,
  hasCompletedValidWorkingSet,
  persistCompletedWorkout,
  type PostWorkoutReview,
} from '@/lib/specialists/gym/gymStorage/gymWorkoutService'
import type { WorkoutSummaryDetail } from '@/lib/specialists/gym/gymActiveWorkoutEngine'
import {
  flushGymPendingOps,
  persistActiveWorkoutWithSync,
  syncCompletedWorkoutToCloud,
} from '@/lib/specialists/gym/gymStorage/gymRepositoryFactory'
import { suggestStartingWeight } from '@/lib/specialists/gym/gymStorage/gymDoubleProgression'
import {
  createPlannedWorkoutSession,
  scheduleFirstSessionTomorrow,
  skipWorkoutSession,
} from '@/lib/specialists/gym/gymScheduleService'
import {
  calendarDateISO,
  nextAvailableTrainingDay,
  todayWorkoutCalendarStatus,
} from '@/lib/specialists/gym/gymSessionStatus'
import {
  cancelDeferredTomorrowSessions,
  resolveFirstSessionIntent,
} from '@/lib/specialists/gym/gymFirstSessionPresentation'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { nowISO } from '@/lib/conversation/conversationUtils'
import type { TodaysWorkout } from '@/lib/specialists/gym/gymTypes'
import { computeDoubleProgression } from '@/lib/specialists/gym/gymStorage/gymDoubleProgression'
import { filterCompletedSessionRecords } from '@/lib/specialists/gym/gymSessionStatus'

interface GymDataContextValue {
  ready: boolean
  profile: GymProfile | null
  profileComplete: boolean
  onboardingComplete: boolean
  sessions: WorkoutSessionRecord[]
  completedSessions: WorkoutSessionRecord[]
  activeWorkout: ActiveWorkout | null
  approvedPlan: ApprovedWorkoutPlan | null
  progressionRecords: ProgressionRecord[]
  todayStatus: ReturnType<typeof todayWorkoutCalendarStatus>
  pendingReschedule: WorkoutSessionRecord | null
  saveProfile: (patch: Partial<GymProfile> & { complete?: boolean }) => GymProfile
  chooseFirstSession: (intent: FirstSessionIntent, todaysTitle?: string) => void
  approveWorkoutPlan: (workout: TodaysWorkout, whySummary: string) => ApprovedWorkoutPlan
  clearApprovedPlan: () => void
  startWorkoutFromPlan: () => ActiveWorkout | null
  /** Move deferred first session to today, approve if needed, create/resume one active session. */
  startWorkoutTodayInstead: (workout: TodaysWorkout, whySummary: string) => ActiveWorkout | null
  /** Acknowledge keep-for-tomorrow; creates no completed history. */
  keepWorkoutForTomorrow: () => void
  /** Offer a different planned day via pending reschedule UI. */
  changeFirstSessionSchedule: (title: string) => WorkoutSessionRecord | null
  saveActiveWorkout: (workout: ActiveWorkout) => void
  discardActiveWorkout: () => void
  finishWorkout: (review?: PostWorkoutReview) => { summary: string; summaryDetail: WorkoutSummaryDetail } | null
  skipWorkout: (reason: WorkoutSkipReason, note?: string) => {
    skipped: WorkoutSessionRecord
    rescheduled: WorkoutSessionRecord | null
  }
  confirmReschedule: () => void
  dismissReschedule: () => void
  refresh: () => void
}

const GymDataContext = createContext<GymDataContextValue | null>(null)

function planFromTodaysWorkout(
  workout: TodaysWorkout,
  whySummary: string,
  sessions: WorkoutSessionRecord[],
  profile: GymProfile | null,
): ApprovedWorkoutPlan {
  const completed = filterCompletedSessionRecords(sessions)
  return {
    id: workout.workoutInstanceId,
    approvedAt: nowISO(),
    title: workout.title,
    workoutInstanceId: workout.workoutInstanceId,
    whySummary,
    exercises: workout.exercises.map(ex => ({
      plannedExerciseId: ex.plannedExerciseId,
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      sets: ex.sets,
      repRange: ex.prescription.repRange,
      targetReps: ex.prescription.targetReps,
      targetRpe: ex.targetRpe,
      suggestedLoadKg: suggestStartingWeight(ex.exerciseId, completed, profile),
      prescriptionConfidence: ex.prescription.prescriptionConfidence,
    })),
  }
}

export function GymDataProvider({ children }: { children: ReactNode }) {
  const { publish } = useFounderKernel()
  const { recordMemory } = useMemoryEngine()
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<GymProfile | null>(null)
  const [sessions, setSessions] = useState<WorkoutSessionRecord[]>([])
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null)
  const [approvedPlan, setApprovedPlan] = useState<ApprovedWorkoutPlan | null>(null)
  const [progressionRecords, setProgressionRecords] = useState<ProgressionRecord[]>([])
  const [pendingReschedule, setPendingReschedule] = useState<WorkoutSessionRecord | null>(null)

  const load = useCallback(() => {
    const repo = getGymStorageRepository()
    const store = repo.load()
    let nextProfile = store.profile
    const listed = repo.listSessions()
    if (nextProfile) {
      const resolved = resolveFirstSessionIntent(nextProfile, listed)
      if (resolved.profilePatch) {
        nextProfile = {
          ...nextProfile,
          ...resolved.profilePatch,
          updatedAt: nowISO(),
        }
        repo.saveProfile(nextProfile)
      }
    }
    setProfile(nextProfile)
    setSessions(listed)
    setActiveWorkout(repo.getActiveWorkout())
    setApprovedPlan(repo.getApprovedPlan())
    setProgressionRecords(repo.listProgressionRecords())
    setReady(true)
  }, [])

  useEffect(() => {
    // Hydrate the provider from the external repository after client mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const flush = () => { void flushGymPendingOps() }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  const saveProfile = useCallback((patch: Partial<GymProfile> & { complete?: boolean }) => {
    const repo = getGymStorageRepository()
    const base = profile ?? createDefaultGymProfile()
    const merged: GymProfile = { ...base, ...patch, updatedAt: nowISO() }
    if (patch.complete === true) {
      merged.complete = validateProfile(merged).length === 0
    }
    const saved = repo.saveProfile(merged)
    setProfile(saved)
    void publish({
      type: 'GymProfileUpdated',
      source: 'gym-ai',
      payload: { profileId: saved.id, complete: saved.complete },
    })
    return saved
  }, [profile, publish])

  const chooseFirstSession = useCallback((intent: FirstSessionIntent, todaysTitle = 'First training session') => {
    const repo = getGymStorageRepository()
    const saved = saveProfile({
      firstSessionIntent: intent,
      firstSessionChoiceComplete: true,
      complete: true,
    })

    if (intent === 'tomorrow') {
      const { planned } = scheduleFirstSessionTomorrow({
        title: todaysTitle,
        plan: repo.getApprovedPlan(),
      })
      repo.addSession(planned)
      setSessions(repo.listSessions())
      void publish({
        type: 'RoutineGenerated',
        source: 'gym-ai',
        payload: {
          title: planned.title,
          status: 'planned',
          scheduledFor: planned.scheduledFor,
          deferredFrom: 'today',
        },
      })
    }

    return saved
  }, [saveProfile, publish])

  const approveWorkoutPlan = useCallback((workout: TodaysWorkout, whySummary: string) => {
    const repo = getGymStorageRepository()
    const plan = planFromTodaysWorkout(workout, whySummary, sessions, profile)
    repo.saveApprovedPlan(plan)
    setApprovedPlan(plan)
    return plan
  }, [sessions, profile])

  const clearApprovedPlan = useCallback(() => {
    const repo = getGymStorageRepository()
    repo.saveApprovedPlan(null)
    setApprovedPlan(null)
  }, [])

  const startWorkoutFromPlan = useCallback(() => {
    const repo = getGymStorageRepository()
    const current = repo.getActiveWorkout()
    if (current) {
      setActiveWorkout(current)
      return current
    }
    const plan = repo.getApprovedPlan()
    if (!plan) return null
    const workout = createOrResumeActiveWorkoutFromPlan(plan, current)
    repo.saveActiveWorkout(workout)
    setActiveWorkout({ ...workout, persistStatus: 'syncing' })

    // Mark / create in_progress session metadata without inventing completed sets.
    const today = calendarDateISO()
    const inProgress: WorkoutSessionRecord = {
      id: workout.id,
      date: `${today}T12:00:00.000Z`,
      scheduledFor: today,
      startedAt: workout.startedAt,
      completedAt: '',
      updatedAt: nowISO(),
      title: workout.title,
      exercises: workout.exercises,
      completed: false,
      status: 'in_progress',
      painFlags: [],
      source: 'gym_logger',
    }
    repo.upsertSession(inProgress)
    setSessions(repo.listSessions())

    void persistActiveWorkoutWithSync(workout).then(({ workout: synced, status }) => {
      if (!synced) return
      setActiveWorkout(prev =>
        prev?.id === synced.id
          ? { ...prev, persistStatus: status, lastPersistError: synced.lastPersistError ?? null }
          : prev,
      )
    })

    void publish({
      type: 'WorkoutStarted',
      source: 'gym-ai',
      payload: { workoutId: workout.id, title: workout.title, status: 'in_progress' },
    })
    return workout
  }, [publish])

  const startWorkoutTodayInstead = useCallback((workout: TodaysWorkout, whySummary: string) => {
    const repo = getGymStorageRepository()
    const today = calendarDateISO()

    // 1. Clear deferred intent (local calendar).
    const base = profile ?? createDefaultGymProfile()
    const savedProfile: GymProfile = {
      ...base,
      firstSessionIntent: 'today',
      firstSessionChoiceComplete: true,
      updatedAt: nowISO(),
    }
    repo.saveProfile(savedProfile)
    setProfile(savedProfile)

    // 2. Cancel tomorrow planned placeholder(s) — no completed sets.
    const { sessions: nextSessions, cancelledIds } = cancelDeferredTomorrowSessions(
      repo.listSessions(),
      today,
      nowISO(),
    )
    for (const s of nextSessions) {
      if (cancelledIds.includes(s.id)) repo.upsertSession(s)
    }
    setSessions(repo.listSessions())

    // 3. Approve plan if needed, then start (idempotent — one active session).
    const existingPlan = repo.getApprovedPlan()
    const alreadyApproved = existingPlan
      && (existingPlan.title === workout.title
        || existingPlan.workoutInstanceId === workout.workoutInstanceId)
    if (!alreadyApproved) {
      const plan = planFromTodaysWorkout(workout, whySummary, repo.listSessions(), savedProfile)
      repo.saveApprovedPlan(plan)
      setApprovedPlan(plan)
    }

    const started = startWorkoutFromPlan()
    void publish({
      type: 'RoutineGenerated',
      source: 'gym-ai',
      payload: {
        title: workout.title,
        status: 'in_progress',
        startedTodayInstead: true,
        cancelledDeferredIds: cancelledIds,
      },
    })
    return started
  }, [profile, startWorkoutFromPlan, publish])

  const keepWorkoutForTomorrow = useCallback(() => {
    // Explicit no-op on history: deferred planned session stays planned.
    void publish({
      type: 'RoutineGenerated',
      source: 'gym-ai',
      payload: {
        status: 'planned',
        keptForTomorrow: true,
        note: 'User kept first session for tomorrow — no completed sets.',
      },
    })
  }, [publish])

  const changeFirstSessionSchedule = useCallback((title: string) => {
    const repo = getGymStorageRepository()
    const today = calendarDateISO()
    const { sessions: nextSessions, cancelledIds } = cancelDeferredTomorrowSessions(
      repo.listSessions(),
      today,
      nowISO(),
    )
    for (const s of nextSessions) {
      if (cancelledIds.includes(s.id)) repo.upsertSession(s)
    }

    const nextDay = nextAvailableTrainingDay(today, profile?.trainingDaysPerWeek ?? 3)
    const offered = createPlannedWorkoutSession({
      title,
      scheduledFor: nextDay,
      plan: repo.getApprovedPlan(),
      notes: 'Reschedule offer after changing first-session schedule. Not completed.',
    })
    setSessions(repo.listSessions())
    setPendingReschedule(offered)

    // Keep intent deferred until confirm; confirmReschedule will add the planned day.
    if (profile) {
      const saved = {
        ...profile,
        firstSessionIntent: 'tomorrow' as const,
        updatedAt: nowISO(),
      }
      repo.saveProfile(saved)
      setProfile(saved)
    }

    return offered
  }, [profile])

  const saveActiveWorkout = useCallback((workout: ActiveWorkout) => {
    const repo = getGymStorageRepository()
    const next: ActiveWorkout = {
      ...workout,
      updatedAt: nowISO(),
      persistStatus: 'syncing',
    }
    repo.saveActiveWorkout(next)
    setActiveWorkout(next)

    // Keep durable session tree aligned for resume (in_progress or paused).
    const existing = repo.listSessions().find(s => s.id === next.id)
    if (existing && (existing.status === 'in_progress' || existing.status === 'paused')) {
      repo.upsertSession({
        ...existing,
        exercises: next.exercises,
        updatedAt: next.updatedAt,
        sessionNotes: next.sessionNotes,
        status: next.status === 'paused' ? 'paused' : 'in_progress',
      })
      setSessions(repo.listSessions())
    }

    void persistActiveWorkoutWithSync(next).then(({ workout: synced, status }) => {
      if (!synced) return
      const latest = getGymStorageRepository().getActiveWorkout()
      if (!latest || latest.id !== synced.id) return
      const withStatus: ActiveWorkout = {
        ...latest,
        persistStatus: status,
        lastPersistError: synced.lastPersistError ?? null,
      }
      getGymStorageRepository().saveActiveWorkout(withStatus)
      setActiveWorkout(prev =>
        prev?.id === withStatus.id ? { ...prev, persistStatus: status, lastPersistError: withStatus.lastPersistError } : prev,
      )
    })
  }, [])

  const discardActiveWorkout = useCallback(() => {
    const repo = getGymStorageRepository()
    const current = repo.getActiveWorkout()
    if (current) {
      const existing = repo.listSessions().find(s =>
        s.id === current.id && (s.status === 'in_progress' || s.status === 'paused'),
      )
      if (existing) {
        repo.upsertSession({ ...existing, status: 'cancelled', updatedAt: nowISO() })
        setSessions(repo.listSessions())
      }
    }
    repo.saveActiveWorkout(null)
    setActiveWorkout(null)
    void persistActiveWorkoutWithSync(null)
  }, [])

  const finishWorkout = useCallback((review?: PostWorkoutReview) => {
    const repo = getGymStorageRepository()
    // Read the repository as the completion lock. The first completion clears it,
    // so a repeated click cannot emit duplicate progression/memory side effects.
    const current = repo.getActiveWorkout()
    if (!current) return null
    if (!hasCompletedValidWorkingSet(current)) return null
    const completedOnly = filterCompletedSessionRecords(sessions)
    const result = completeWorkout(current, profile, completedOnly, review)
    // Persist locally first so active state clears only after the session is durable.
    persistCompletedWorkout(result)
    recordMemory({
      type: 'health_log',
      title: result.memoryTitle,
      content: result.memoryContent,
      importance: 'medium',
      area: 'health',
      source: 'manual',
      relatedObjectIds: [],
      tags: ['gym', 'workout', 'health'],
      occurredAt: result.session.completedAt,
    })
    setSessions(repo.listSessions())
    setActiveWorkout(null)
    setApprovedPlan(null)
    repo.saveApprovedPlan(null)
    setProgressionRecords(repo.listProgressionRecords())

    void syncCompletedWorkoutToCloud(result)

    void publish({
      type: 'WorkoutCompleted',
      source: 'gym-ai',
      payload: {
        sessionId: result.session.id,
        title: result.session.title,
        volumeKg: result.session.totalVolumeKg,
        adherence: result.session.adherenceScore,
        status: 'completed',
        musclesTrained: result.summaryDetail.musclesTrained,
        prCount: result.prs.length,
        sessionRpe: result.session.sessionRpe,
        energyAfter: result.session.energyAfter,
      },
    })
    // Cognitive / domain subscribers listen for WorkoutLogged.
    void publish({
      type: 'WorkoutLogged',
      source: 'gym-ai',
      payload: {
        sessionId: result.session.id,
        title: result.session.title,
        volumeKg: result.session.totalVolumeKg,
        adherence: result.session.adherenceScore,
      },
    })
    void publish({
      type: 'WeeklyVolumeUpdated',
      source: 'gym-ai',
      payload: { sessionId: result.session.id },
    })
    // Exertion inputs are published for the recovery engine — do not claim recovery changed.
    void publish({
      type: 'RecoveryUpdated',
      source: 'gym-ai',
      payload: {
        sessionId: result.session.id,
        prediction: result.summaryDetail.recoveryPrediction,
        sessionRpe: result.session.sessionRpe,
        energyAfter: result.session.energyAfter,
        discomfortReported: result.session.discomfortReported,
        note: 'Exertion inputs recorded; recovery engine interprets fatigue — not a medical claim.',
      },
    })

    for (const pr of result.prs) {
      void publish({
        type: 'ExercisePR',
        source: 'gym-ai',
        payload: { exerciseName: pr.exerciseName, detail: pr.detail, e1rm: pr.e1rm },
      })
    }

    for (const ex of result.session.exercises) {
      const pain = ex.sets.some(s => s.painFlag)
      if (pain) {
        void publish({
          type: 'PainReported',
          source: 'gym-ai',
          payload: { exerciseId: ex.exerciseId, exerciseName: ex.exerciseName },
        })
      }
    }

    return { summary: result.summary, summaryDetail: result.summaryDetail }
  }, [profile, sessions, publish, recordMemory])

  const skipWorkout = useCallback((reason: WorkoutSkipReason, note?: string) => {
    const repo = getGymStorageRepository()
    const today = calendarDateISO()
    const existing = sessions.find(s =>
      (s.scheduledFor ?? s.date).slice(0, 10) === today
      && (s.status === 'planned' || s.status === 'in_progress'),
    )
    const title = approvedPlan?.title
      ?? existing?.title
      ?? activeWorkout?.title
      ?? 'Scheduled workout'

    const { skipped, rescheduled } = skipWorkoutSession({
      session: existing,
      title,
      reason,
      note,
      profile,
      offerReschedule: true,
    })

    if (activeWorkout) {
      repo.saveActiveWorkout(null)
      setActiveWorkout(null)
    }

    repo.upsertSession(skipped)
    setSessions(repo.listSessions())
    setPendingReschedule(rescheduled)

    void publish({
      type: 'RoutineGenerated',
      source: 'gym-ai',
      payload: {
        title: skipped.title,
        status: 'skipped',
        skipReason: reason,
        sessionId: skipped.id,
      },
    })

    return { skipped, rescheduled }
  }, [sessions, approvedPlan, activeWorkout, profile, publish])

  const confirmReschedule = useCallback(() => {
    if (!pendingReschedule) return
    const repo = getGymStorageRepository()
    repo.addSession(pendingReschedule)
    setSessions(repo.listSessions())
    setPendingReschedule(null)
    void publish({
      type: 'RoutineGenerated',
      source: 'gym-ai',
      payload: {
        title: pendingReschedule.title,
        status: 'planned',
        scheduledFor: pendingReschedule.scheduledFor,
        rescheduled: true,
      },
    })
  }, [pendingReschedule, publish])

  const dismissReschedule = useCallback(() => {
    setPendingReschedule(null)
  }, [])

  const todayStatus = useMemo(
    () => todayWorkoutCalendarStatus(sessions),
    [sessions],
  )

  const completedSessions = useMemo(
    () => filterCompletedSessionRecords(sessions),
    [sessions],
  )

  const value = useMemo<GymDataContextValue>(() => ({
    ready,
    profile,
    profileComplete: isProfileComplete(profile),
    onboardingComplete: isGymOnboardingComplete(profile),
    sessions,
    completedSessions,
    activeWorkout,
    approvedPlan,
    progressionRecords,
    todayStatus,
    pendingReschedule,
    saveProfile,
    chooseFirstSession,
    approveWorkoutPlan,
    clearApprovedPlan,
    startWorkoutFromPlan,
    startWorkoutTodayInstead,
    keepWorkoutForTomorrow,
    changeFirstSessionSchedule,
    saveActiveWorkout,
    discardActiveWorkout,
    finishWorkout,
    skipWorkout,
    confirmReschedule,
    dismissReschedule,
    refresh: load,
  }), [
    ready, profile, sessions, completedSessions, activeWorkout, approvedPlan,
    progressionRecords, todayStatus, pendingReschedule,
    saveProfile, chooseFirstSession, approveWorkoutPlan, clearApprovedPlan,
    startWorkoutFromPlan, startWorkoutTodayInstead, keepWorkoutForTomorrow,
    changeFirstSessionSchedule,
    saveActiveWorkout, discardActiveWorkout, finishWorkout,
    skipWorkout, confirmReschedule, dismissReschedule, load,
  ])

  return (
    <GymDataContext.Provider value={value}>
      {children}
    </GymDataContext.Provider>
  )
}

export function useGymData(): GymDataContextValue {
  const ctx = useContext(GymDataContext)
  if (!ctx) throw new Error('useGymData must be used within GymDataProvider')
  return ctx
}

export function buildWhyWorkoutSummary(workout: TodaysWorkout, hasHistory: boolean): string {
  const muscles = workout.musclesTrained.join(', ') || 'balanced'
  const historyNote = hasHistory
    ? 'Recent completed sessions and weekly volume informed exercise selection.'
    : 'No completed workout history yet — using profile, recovery, and research guidance. Planned or skipped sessions do not count as training.'
  return `${workout.rationale} Muscle priorities: ${muscles}. ${historyNote}`
}

export function getProgressionForExercise(
  exerciseId: string,
  exerciseName: string,
  sessions: WorkoutSessionRecord[],
  profile: GymProfile | null,
  targetRepRange = '8-10',
) {
  return computeDoubleProgression({
    exerciseId,
    exerciseName,
    sessions: filterCompletedSessionRecords(sessions),
    targetRepRange,
    profile,
  })
}
