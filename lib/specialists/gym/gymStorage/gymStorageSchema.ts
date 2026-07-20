import type {
  GymDatastore,
  GymProfile,
  ActiveWorkout,
  WorkoutSessionRecord,
  ApprovedWorkoutPlan,
  WorkoutSessionStatus,
} from './gymStorageTypes'
import { GYM_STORAGE_VERSION, MAX_SESSIONS } from './gymStorageTypes'
import {
  normalizeApprovedPlanExercises,
  normalizeActiveWorkoutExercises,
} from '../gymPlannedExerciseUtils'
import { normalizeWorkoutStatus } from '../gymSessionStatus'

export function validateProfile(profile: GymProfile): string[] {
  const errors: string[] = []
  if (!profile.primaryGoal) errors.push('primaryGoal required')
  if (!profile.experience) errors.push('experience required')
  if (profile.trainingDaysPerWeek < 1 || profile.trainingDaysPerWeek > 7) errors.push('trainingDaysPerWeek 1-7')
  if (profile.sessionDurationMinutes < 15 || profile.sessionDurationMinutes > 180) errors.push('sessionDurationMinutes 15-180')
  if (profile.smallestLoadIncrementKg <= 0) errors.push('smallestLoadIncrementKg must be positive')
  if (profile.age != null && (profile.age < 13 || profile.age > 100)) errors.push('age out of range')
  return errors
}

/** Repair duplicate exercises and missing plannedExerciseIds without wiping profile/history. */
export function migrateApprovedPlan(plan: ApprovedWorkoutPlan | null): ApprovedWorkoutPlan | null {
  if (!plan) return null
  return {
    ...plan,
    exercises: normalizeApprovedPlanExercises(plan.exercises, plan.workoutInstanceId ?? plan.id),
  }
}

export function migrateActiveWorkout(workout: ActiveWorkout | null): ActiveWorkout | null {
  if (!workout) return null
  return {
    ...workout,
    exercises: normalizeActiveWorkoutExercises(workout.exercises, workout.id),
  }
}

export function migrateSessionRecord(raw: WorkoutSessionRecord): WorkoutSessionRecord {
  const status: WorkoutSessionStatus = normalizeWorkoutStatus(raw)
  return {
    ...raw,
    status,
    completed: status === 'completed',
    updatedAt: raw.updatedAt ?? raw.completedAt ?? raw.startedAt,
    scheduledFor: raw.scheduledFor ?? raw.date?.slice(0, 10),
    painFlags: Array.isArray(raw.painFlags) ? raw.painFlags : [],
    exercises: Array.isArray(raw.exercises) ? raw.exercises : [],
  }
}

export function sanitizeDatastore(raw: Partial<GymDatastore>): GymDatastore {
  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions.map(migrateSessionRecord).slice(0, MAX_SESSIONS)
    : []
  return {
    version: GYM_STORAGE_VERSION,
    profile: raw.profile ?? null,
    activeWorkout: migrateActiveWorkout(raw.activeWorkout ?? null),
    approvedPlan: migrateApprovedPlan(raw.approvedPlan ?? null),
    sessions,
    templates: Array.isArray(raw.templates) ? raw.templates.slice(0, 20) : [],
    progressionRecords: Array.isArray(raw.progressionRecords) ? raw.progressionRecords.slice(0, 100) : [],
  }
}

export function migrateDatastore(raw: unknown): GymDatastore {
  if (!raw || typeof raw !== 'object') {
    return emptyDatastore()
  }
  const data = raw as Partial<GymDatastore>
  const version = data.version ?? 0
  // v0 → v1 → v2: session status normalisation runs in sanitize for all versions
  if (version < 2) {
    return sanitizeDatastore({ ...data, version: 2 })
  }
  return sanitizeDatastore(data)
}

export function emptyDatastore(): GymDatastore {
  return {
    version: GYM_STORAGE_VERSION,
    profile: null,
    activeWorkout: null,
    approvedPlan: null,
    sessions: [],
    templates: [],
    progressionRecords: [],
  }
}

export function sessionToWorkoutSessionRecord(session: WorkoutSessionRecord) {
  return session
}

export function isProfileComplete(profile: GymProfile | null): boolean {
  return Boolean(profile?.complete && validateProfile(profile).length === 0)
}

/** Profile complete AND user has chosen first training day. */
export function isGymOnboardingComplete(profile: GymProfile | null): boolean {
  return isProfileComplete(profile) && Boolean(profile?.firstSessionChoiceComplete)
}

export function dedupeSessions(sessions: WorkoutSessionRecord[]): WorkoutSessionRecord[] {
  const seen = new Set<string>()
  const out: WorkoutSessionRecord[] = []
  const sorted = [...sessions].sort((a, b) => {
    const aKey = a.updatedAt ?? a.completedAt ?? a.startedAt
    const bKey = b.updatedAt ?? b.completedAt ?? b.startedAt
    return bKey.localeCompare(aKey)
  })
  for (const s of sorted) {
    const day = (s.scheduledFor ?? s.date).slice(0, 10)
    const key = `${day}-${s.title}-${s.status}`
    if (seen.has(key) && s.status !== 'completed') continue
    const completedKey = `${day}-${s.title}-completed`
    if (s.status === 'completed' && seen.has(completedKey)) continue
    if (s.status === 'completed') seen.add(completedKey)
    else seen.add(key)
    out.push(s)
  }
  return out.slice(0, MAX_SESSIONS)
}

export function compactDatastore(store: GymDatastore): GymDatastore {
  return {
    ...store,
    version: GYM_STORAGE_VERSION,
    activeWorkout: migrateActiveWorkout(store.activeWorkout),
    approvedPlan: migrateApprovedPlan(store.approvedPlan),
    sessions: dedupeSessions(store.sessions.map(migrateSessionRecord)),
    templates: store.templates.slice(0, 20),
    progressionRecords: store.progressionRecords.slice(0, 100),
  }
}
