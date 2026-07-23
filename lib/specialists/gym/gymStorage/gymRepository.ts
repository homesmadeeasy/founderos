/**
 * GymRepository — storage-agnostic contract for Gym persistence.
 * UI and GymDataContext must not call Supabase directly.
 */

import type {
  ActiveWorkout,
  ApprovedWorkoutPlan,
  GymProfile,
  ProgressionRecord,
  SetPerformanceRecord,
  WorkoutSessionRecord,
} from './gymStorageTypes'

export interface GymRepository {
  getProfile(): Promise<GymProfile | null>
  saveProfile(profile: GymProfile): Promise<GymProfile>

  getActiveWorkout(): Promise<ActiveWorkout | null>
  saveActiveWorkout(workout: ActiveWorkout | null): Promise<void>

  getApprovedPlan(): Promise<ApprovedWorkoutPlan | null>
  saveApprovedPlan(plan: ApprovedWorkoutPlan | null): Promise<void>

  getWorkoutHistory(): Promise<WorkoutSessionRecord[]>
  createWorkoutSession(session: WorkoutSessionRecord): Promise<void>
  updateWorkoutSession(session: WorkoutSessionRecord): Promise<void>
  completeWorkoutSession(session: WorkoutSessionRecord): Promise<void>

  createOrUpdateSet(
    sessionId: string,
    exerciseKey: string,
    set: SetPerformanceRecord,
  ): Promise<SetPerformanceRecord>
  deleteSet(sessionId: string, exerciseKey: string, setId: string): Promise<void>

  getExerciseHistory(exerciseId: string): Promise<WorkoutSessionRecord[]>
  saveProgressionRecord(record: ProgressionRecord): Promise<void>
  listProgressionRecords(): Promise<ProgressionRecord[]>
}

export type GymRepositoryKind = 'local' | 'supabase'
