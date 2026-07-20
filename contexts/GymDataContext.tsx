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
  createActiveWorkoutFromPlan,
  persistCompletedWorkout,
} from '@/lib/specialists/gym/gymStorage/gymWorkoutService'
import {
  scheduleFirstSessionTomorrow,
  skipWorkoutSession,
} from '@/lib/specialists/gym/gymScheduleService'
import {
  calendarDateISO,
  todayWorkoutCalendarStatus,
} from '@/lib/specialists/gym/gymSessionStatus'
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
  saveActiveWorkout: (workout: ActiveWorkout) => void
  discardActiveWorkout: () => void
  finishWorkout: () => { summary: string } | null
  skipWorkout: (reason: WorkoutSkipReason, note?: string) => {
    skipped: WorkoutSessionRecord
    rescheduled: WorkoutSessionRecord | null
  }
  confirmReschedule: () => void
  dismissReschedule: () => void
  refresh: () => void
}

const GymDataContext = createContext<GymDataContextValue | null>(null)

function planFromTodaysWorkout(workout: TodaysWorkout, whySummary: string): ApprovedWorkoutPlan {
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
      suggestedLoadKg: null,
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
    setProfile(store.profile)
    setSessions(repo.listSessions())
    setActiveWorkout(repo.getActiveWorkout())
    setApprovedPlan(repo.getApprovedPlan())
    setProgressionRecords(repo.listProgressionRecords())
    setReady(true)
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
    const plan = planFromTodaysWorkout(workout, whySummary)
    repo.saveApprovedPlan(plan)
    setApprovedPlan(plan)
    return plan
  }, [])

  const clearApprovedPlan = useCallback(() => {
    const repo = getGymStorageRepository()
    repo.saveApprovedPlan(null)
    setApprovedPlan(null)
  }, [])

  const startWorkoutFromPlan = useCallback(() => {
    const repo = getGymStorageRepository()
    const plan = repo.getApprovedPlan()
    if (!plan) return null
    const workout = createActiveWorkoutFromPlan(plan, plan.title)
    repo.saveActiveWorkout(workout)
    setActiveWorkout(workout)

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
      exercises: [],
      completed: false,
      status: 'in_progress',
      painFlags: [],
      source: 'gym_logger',
    }
    repo.upsertSession(inProgress)
    setSessions(repo.listSessions())

    void publish({
      type: 'WorkoutStarted',
      source: 'gym-ai',
      payload: { workoutId: workout.id, title: workout.title, status: 'in_progress' },
    })
    return workout
  }, [publish])

  const saveActiveWorkout = useCallback((workout: ActiveWorkout) => {
    const repo = getGymStorageRepository()
    const next = { ...workout, updatedAt: nowISO() }
    repo.saveActiveWorkout(next)
    setActiveWorkout(next)
  }, [])

  const discardActiveWorkout = useCallback(() => {
    const repo = getGymStorageRepository()
    repo.saveActiveWorkout(null)
    setActiveWorkout(null)
  }, [])

  const finishWorkout = useCallback(() => {
    if (!activeWorkout) return null
    const repo = getGymStorageRepository()
    const completedOnly = filterCompletedSessionRecords(sessions)
    const result = completeWorkout(activeWorkout, profile, completedOnly)
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

    void publish({
      type: 'WorkoutCompleted',
      source: 'gym-ai',
      payload: {
        sessionId: result.session.id,
        title: result.session.title,
        volumeKg: result.session.totalVolumeKg,
        adherence: result.session.adherenceScore,
        status: 'completed',
      },
    })
    void publish({
      type: 'WeeklyVolumeUpdated',
      source: 'gym-ai',
      payload: { sessionId: result.session.id },
    })

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

    return { summary: result.summary }
  }, [activeWorkout, profile, sessions, publish, recordMemory])

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
    startWorkoutFromPlan, saveActiveWorkout, discardActiveWorkout, finishWorkout,
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
