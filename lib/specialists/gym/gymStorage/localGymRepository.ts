/**
 * LocalGymRepository — offline/development primary store (localStorage).
 * Wraps the existing GymStorageRepository with the async GymRepository contract.
 */

import type { GymRepository } from './gymRepository'
import {
  createGymStorageRepository,
  type GymStorageRepository,
} from './gymStorageRepository'
import type {
  ActiveWorkout,
  ApprovedWorkoutPlan,
  GymProfile,
  ProgressionRecord,
  SetPerformanceRecord,
  WorkoutSessionRecord,
} from './gymStorageTypes'
import { exerciseKey } from '../gymActiveWorkoutEngine'

export function createLocalGymRepository(
  storage: GymStorageRepository = createGymStorageRepository(),
): GymRepository {
  return {
    async getProfile() {
      return storage.getProfile()
    },
    async saveProfile(profile: GymProfile) {
      return storage.saveProfile(profile)
    },
    async getActiveWorkout() {
      return storage.getActiveWorkout()
    },
    async saveActiveWorkout(workout: ActiveWorkout | null) {
      storage.saveActiveWorkout(workout)
    },
    async getApprovedPlan() {
      return storage.getApprovedPlan()
    },
    async saveApprovedPlan(plan: ApprovedWorkoutPlan | null) {
      storage.saveApprovedPlan(plan)
    },
    async getWorkoutHistory() {
      return storage.listSessions()
    },
    async createWorkoutSession(session: WorkoutSessionRecord) {
      storage.upsertSession(session)
    },
    async updateWorkoutSession(session: WorkoutSessionRecord) {
      storage.upsertSession(session)
    },
    async completeWorkoutSession(session: WorkoutSessionRecord) {
      storage.upsertSession({ ...session, completed: true, status: 'completed' })
      storage.saveActiveWorkout(null)
    },
    async createOrUpdateSet(sessionId, exerciseKeyValue, set: SetPerformanceRecord) {
      const active = storage.getActiveWorkout()
      if (active && active.id === sessionId) {
        const exercises = active.exercises.map(ex => {
          if (exerciseKey(ex) !== exerciseKeyValue && ex.exerciseId !== exerciseKeyValue) return ex
          const without = ex.sets.filter(s => s.id !== set.id)
          return { ...ex, sets: [...without, set].sort((a, b) => a.setNumber - b.setNumber) }
        })
        storage.saveActiveWorkout({ ...active, exercises, updatedAt: new Date().toISOString() })
        return set
      }
      const sessions = storage.listSessions()
      const session = sessions.find(s => s.id === sessionId)
      if (!session) throw new Error('Session not found for set upsert')
      const exercises = session.exercises.map(ex => {
        if (exerciseKey(ex) !== exerciseKeyValue && ex.exerciseId !== exerciseKeyValue) return ex
        const without = ex.sets.filter(s => s.id !== set.id)
        return { ...ex, sets: [...without, set].sort((a, b) => a.setNumber - b.setNumber) }
      })
      storage.upsertSession({ ...session, exercises })
      return set
    },
    async deleteSet(sessionId, exerciseKeyValue, setId) {
      const active = storage.getActiveWorkout()
      if (active && active.id === sessionId) {
        const exercises = active.exercises.map(ex => {
          if (exerciseKey(ex) !== exerciseKeyValue && ex.exerciseId !== exerciseKeyValue) return ex
          return {
            ...ex,
            sets: ex.sets.filter(s => s.id !== setId).map((s, i) => ({ ...s, setNumber: i + 1 })),
          }
        })
        storage.saveActiveWorkout({ ...active, exercises, updatedAt: new Date().toISOString() })
        return
      }
      const sessions = storage.listSessions()
      const session = sessions.find(s => s.id === sessionId)
      if (!session) return
      const exercises = session.exercises.map(ex => {
        if (exerciseKey(ex) !== exerciseKeyValue && ex.exerciseId !== exerciseKeyValue) return ex
        return {
          ...ex,
          sets: ex.sets.filter(s => s.id !== setId).map((s, i) => ({ ...s, setNumber: i + 1 })),
        }
      })
      storage.upsertSession({ ...session, exercises })
    },
    async getExerciseHistory(exerciseId: string) {
      return storage.listSessions().filter(s =>
        s.exercises.some(e => e.exerciseId === exerciseId),
      )
    },
    async saveProgressionRecord(record: ProgressionRecord) {
      storage.addProgressionRecord(record)
    },
    async listProgressionRecords() {
      return storage.listProgressionRecords()
    },
  }
}
