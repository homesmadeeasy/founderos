import type { GymDatastore, GymProfile, ActiveWorkout, WorkoutSessionRecord, ApprovedWorkoutPlan, ProgressionRecord } from './gymStorageTypes'
import { compactDatastore, emptyDatastore, migrateDatastore, migrateActiveWorkout, migrateApprovedPlan } from './gymStorageSchema'
import { newConversationId, nowISO } from '@/lib/conversation/conversationUtils'

const STORAGE_KEY = 'founderos-gym-data-v1'

function readRaw(): GymDatastore {
  if (typeof localStorage === 'undefined') return emptyDatastore()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyDatastore()
    return migrateDatastore(JSON.parse(raw))
  } catch {
    return emptyDatastore()
  }
}

function writeRaw(store: GymDatastore): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compactDatastore(store)))
}

export interface GymStorageRepository {
  load: () => GymDatastore
  save: (store: GymDatastore) => void
  getProfile: () => GymProfile | null
  saveProfile: (profile: GymProfile) => GymProfile
  getActiveWorkout: () => ActiveWorkout | null
  saveActiveWorkout: (workout: ActiveWorkout | null) => void
  getApprovedPlan: () => ApprovedWorkoutPlan | null
  saveApprovedPlan: (plan: ApprovedWorkoutPlan | null) => void
  listSessions: () => WorkoutSessionRecord[]
  addSession: (session: WorkoutSessionRecord) => void
  upsertSession: (session: WorkoutSessionRecord) => void
  addSessions: (sessions: WorkoutSessionRecord[]) => void
  addProgressionRecord: (record: ProgressionRecord) => void
  listProgressionRecords: () => ProgressionRecord[]
}

export function createGymStorageRepository(): GymStorageRepository {
  return {
    load: readRaw,
    save: writeRaw,
    getProfile: () => readRaw().profile,
    saveProfile(profile) {
      const store = readRaw()
      const next = { ...profile, updatedAt: nowISO() }
      writeRaw({ ...store, profile: next })
      return next
    },
    getActiveWorkout: () => readRaw().activeWorkout,
    saveActiveWorkout(workout) {
      const store = readRaw()
      writeRaw({ ...store, activeWorkout: migrateActiveWorkout(workout) })
    },
    getApprovedPlan: () => readRaw().approvedPlan,
    saveApprovedPlan(plan) {
      const store = readRaw()
      writeRaw({ ...store, approvedPlan: migrateApprovedPlan(plan) })
    },
    listSessions: () => readRaw().sessions,
    addSession(session) {
      const store = readRaw()
      writeRaw({ ...store, sessions: [session, ...store.sessions] })
    },
    upsertSession(session) {
      const store = readRaw()
      const without = store.sessions.filter(s => s.id !== session.id)
      writeRaw({ ...store, sessions: [session, ...without] })
    },
    addSessions(sessions) {
      const store = readRaw()
      writeRaw({ ...store, sessions: [...sessions, ...store.sessions] })
    },
    addProgressionRecord(record) {
      const store = readRaw()
      writeRaw({ ...store, progressionRecords: [record, ...store.progressionRecords] })
    },
    listProgressionRecords: () => readRaw().progressionRecords,
  }
}

let singleton: GymStorageRepository | null = null

export function getGymStorageRepository(): GymStorageRepository {
  if (!singleton) singleton = createGymStorageRepository()
  return singleton
}

export function resetGymStorageForTests(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  singleton = null
}

export function newGymId(): string {
  return newConversationId()
}
