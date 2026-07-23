import type { GymGoal, MuscleGroup, Equipment, SetPerformance } from '../gymTypes'

export const GYM_STORAGE_VERSION = 3
export const MAX_SESSIONS = 200
export const MAX_TEMPLATES = 20
export const MAX_PROGRESSION_RECORDS = 100
export const MAX_ACTIVE_SETS_PER_EXERCISE = 20
export const MAX_EXERCISES_PER_SESSION = 24
export const GYM_PENDING_WRITES_KEY = 'founderos-gym-pending-writes-v1'

export type TrackingMode = 'rpe' | 'rir' | 'simple'
export type FatLossGoal = 'fat_loss_maintain_muscle'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type PreferredSplit = 'push_pull_legs' | 'upper_lower' | 'full_body' | 'custom' | 'auto'
export type ProgressionAction = 'maintain' | 'increase' | 'reduce' | 'deload_consideration' | 'insufficient_data'
export type VolumeDataStatus = 'insufficient_data' | 'below_baseline' | 'within_baseline' | 'above_baseline'
export type SetType = 'warmup' | 'working'

export type WorkoutSessionStatus =
  | 'planned'
  | 'in_progress'
  | 'paused'
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

export type ExerciseSkipReason =
  | 'fatigue'
  | 'pain'
  | 'equipment'
  | 'time'
  | 'preference'
  | 'other'

export type PersistStatus = 'saved' | 'syncing' | 'failed' | 'offline'

export type FirstSessionIntent = 'today' | 'tomorrow'

export type SessionEnergyAfter = 'low' | 'ok' | 'high'

export interface GymProfile {
  id: string
  userId?: string
  complete: boolean
  /** Whether the user finished the start-today / start-tomorrow choice. */
  firstSessionChoiceComplete?: boolean
  firstSessionIntent?: FirstSessionIntent
  primaryGoal: GymGoal | FatLossGoal
  experience: ExperienceLevel
  age?: number
  heightCm?: number
  weightKg?: number
  trainingDaysPerWeek: number
  sessionDurationMinutes: number
  equipment: Equipment[]
  preferredSplit: PreferredSplit
  exercisesEnjoy: string[]
  exercisesDislike: string[]
  injuryLimitations: string[]
  targetMuscles: MuscleGroup[]
  bodyMeasurements?: Record<string, number>
  estimatedOneRepMaxes: Record<string, number>
  trackingMode: TrackingMode
  smallestLoadIncrementKg: number
  createdAt: string
  updatedAt: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  goal: GymGoal
  split: string
  exerciseIds: string[]
  estimatedMinutes: number
  createdAt: string
}

export interface SetPerformanceRecord extends SetPerformance {
  id: string
  setType: SetType
  completedAt?: string
  rir?: number
  painFlag?: boolean
  discomfortNote?: string
  /** True when the set was taken to failure (not the same as pain). */
  failed?: boolean
}

export interface ExercisePerformanceRecord {
  /** Stable per-workout instance ID (survives refresh). */
  plannedExerciseId?: string
  exerciseId: string
  exerciseName: string
  order: number
  sets: SetPerformanceRecord[]
  notes?: string
  skipped?: boolean
  skipReason?: ExerciseSkipReason
  /** User explicitly ended the exercise; incomplete sets remain incomplete. */
  finished?: boolean
  substitutedFromId?: string
  /** Snapshot of the original prescription before substitutions / edits. */
  originalPrescription?: {
    exerciseId: string
    exerciseName: string
    sets: number
    repRange: string
    targetReps: number
    targetRpe?: number
    targetRir?: number
    suggestedLoadKg?: number | null
  }
}

export interface WorkoutSessionRecord {
  id: string
  /** Calendar date the workout is/was for (ISO). Prefer scheduledFor when present for planning. */
  date: string
  /** Explicit scheduled calendar day (YYYY-MM-DD or ISO). */
  scheduledFor?: string
  startedAt: string
  completedAt: string
  updatedAt?: string
  title: string
  exercises: ExercisePerformanceRecord[]
  durationMinutes?: number
  /**
   * Legacy boolean — keep in sync with status === 'completed'.
   * Statistics engines must use status / isCompletedWorkoutSession, never invent sets.
   */
  completed: boolean
  status: WorkoutSessionStatus
  skipReason?: WorkoutSkipReason
  skipNote?: string
  rescheduledTo?: string
  rescheduledFromId?: string
  sessionNotes?: string
  painFlags: string[]
  adherenceScore?: number
  totalVolumeKg?: number
  source: 'gym_logger'
  /** Post-workout review — optional exertion / recovery inputs (not medical claims). */
  sessionRpe?: number
  energyAfter?: SessionEnergyAfter
  discomfortReported?: boolean
  bodyweightKg?: number
}

export interface ActiveWorkout {
  id: string
  startedAt: string
  updatedAt: string
  status: 'active' | 'paused'
  title: string
  exercises: ExercisePerformanceRecord[]
  sessionNotes: string
  restTimerEndsAt?: string | null
  /** When the workout was paused, remaining rest ms to restore on resume. */
  pausedRestRemainingMs?: number | null
  approvedAt?: string
  basedOnSnapshotTitle?: string
  persistStatus?: PersistStatus
  lastPersistError?: string | null
  /** Focused exercise key for resume (plannedExerciseId or exerciseId::order). */
  currentExerciseKey?: string | null
}

export interface ProgressionRecord {
  id: string
  exerciseId: string
  exerciseName: string
  date: string
  action: ProgressionAction
  recommendation: string
  evidence: string
  researchClaimIds: string[]
  lastWeight?: number
  lastReps?: number
  targetRepRange?: string
}

export interface ApprovedWorkoutPlan {
  id: string
  approvedAt: string
  title: string
  workoutInstanceId?: string
  exercises: {
    plannedExerciseId?: string
    exerciseId: string
    exerciseName: string
    sets: number
    repRange: string
    targetReps: number
    targetRpe?: number
    targetRir?: number
    suggestedLoadKg?: number | null
    prescriptionConfidence: number
  }[]
  whySummary: string
}

export interface GymDatastore {
  version: number
  profile: GymProfile | null
  activeWorkout: ActiveWorkout | null
  approvedPlan: ApprovedWorkoutPlan | null
  sessions: WorkoutSessionRecord[]
  templates: WorkoutTemplate[]
  progressionRecords: ProgressionRecord[]
}

export interface MuscleVolumeBreakdown {
  muscle: MuscleGroup
  directSets: number
  secondarySets: number
  totalWeightedSets: number
  status: VolumeDataStatus
  researchContext?: string
}
