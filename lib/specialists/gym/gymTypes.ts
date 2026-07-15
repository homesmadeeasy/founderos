import type { DecisionOutput } from '@/lib/decision-engine/decisionTypes'
import type { DailyContext } from '@/lib/context-builder/contextTypes'
import type { DomainIntelligenceOutput } from '@/lib/domain-intelligence/domainTypes'
import type { EveningReview } from '@/lib/evening-review/eveningTypes'
import type { HealthSignals } from '@/lib/executive-engine/executiveTypes'
import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { MorningExecutionPlan } from '@/lib/morning-execution/morningTypes'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type { OutcomeHistoryEntry } from '@/lib/outcome-engine/outcomeTypes'
import type { Signal } from '@/lib/signal-engine/signalTypes'
import type { Project, Task } from '@/lib/types'
import type { WorldModel } from '@/lib/cognitive-model/beliefTypes'

export type GymGoal =
  | 'muscle_growth'
  | 'strength'
  | 'powerlifting'
  | 'athletic_performance'
  | 'weight_loss'
  | 'general_fitness'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'triceps'
  | 'biceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'lower_back'

export type VolumeStatus = 'optimal' | 'low' | 'high' | 'recovering' | 'neglected' | 'unknown'

export type RecoveryStatus = 'ready' | 'train_light' | 'recover' | 'deload'

export type MovementPattern =
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'carry'
  | 'isolation'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'bands'

export interface Exercise {
  id: string
  name: string
  primaryMuscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  movementPattern: MovementPattern
  compound: boolean
  repRange: string
  restSeconds: number
  videoPlaceholder?: string
}

export interface SetPerformance {
  setNumber: number
  reps: number
  weight: number
  rpe?: number
  restSeconds?: number
  completed: boolean
  notes?: string
}

export interface ExercisePerformance {
  exerciseId: string
  exerciseName: string
  sets: SetPerformance[]
  notes?: string
}

export interface WorkoutSession {
  id: string
  date: string
  title: string
  exercises: ExercisePerformance[]
  durationMinutes?: number
  completed: boolean
  notes?: string
  sourceType: 'object' | 'memory' | 'signal'
  sourceId: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  goal: GymGoal
  split: string
  exerciseIds: string[]
  estimatedMinutes: number
}

export interface WeeklyVolume {
  muscle: MuscleGroup
  sets: number
  status: VolumeStatus
  trend: 'up' | 'down' | 'stable' | 'unknown'
}

export interface TrainingBlock {
  id: string
  name: string
  goal: GymGoal
  weeksRemaining: number
  focus: string
}

export interface StrengthEstimate {
  exerciseId: string
  exerciseName: string
  estimatedMax: number | null
  trend: 'up' | 'down' | 'plateau' | 'unknown'
  lastWeight: number | null
  lastReps: number | null
  personalBest: { weight: number; reps: number; date: string } | null
}

export interface GoalProfile {
  primaryGoal: GymGoal
  label: string
  trainingDaysPerWeek: number
  experience: 'beginner' | 'intermediate' | 'advanced'
}

export interface EquipmentProfile {
  available: Equipment[]
  limitations: string[]
}

export interface InjuryProfile {
  areas: string[]
  restrictions: string[]
}

export interface TechniqueReview {
  id: string
  exerciseId: string
  status: 'placeholder'
  notes: string
}

export interface VideoAnalysis {
  id: string
  exerciseId: string
  status: 'placeholder'
  summary: string
}

export interface MovementAnalysis {
  id: string
  exerciseId: string
  status: 'placeholder'
  findings: string[]
}

export interface PlannedExercise {
  exerciseId: string
  exerciseName: string
  order: number
  sets: number
  reps: string
  restSeconds: number
  targetRpe: number
  primaryMuscle: MuscleGroup
  prescription: import('./evidence/gymEvidenceTypes').WorkoutExercisePrescription
}

export interface TodaysWorkout {
  title: string
  exercises: PlannedExercise[]
  estimatedMinutes: number
  musclesTrained: MuscleGroup[]
  rationale: string
  evidenceIds: string[]
  researchSummary: import('./evidence/gymEvidenceTypes').WorkoutResearchSummary
}

export interface GymWeakness {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high'
  description: string
  muscle?: MuscleGroup
}

export interface GymEvidence {
  id: string
  sourceType: 'memory' | 'signal' | 'outcome' | 'decision' | 'object' | 'domain' | 'knowledge' | 'health'
  title: string
  summary: string
  weight: number
  supports: boolean
}

export interface GymRecommendation {
  exerciseId: string
  exerciseName: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export interface GymSnapshot {
  momentumScore: number
  consistencyScore: number
  recoveryScore: number
  volumeScore: number
  progressionScore: number
  mainInsight: string
  topRecommendation: string
  recoveryStatus: RecoveryStatus
  todaysWorkout: TodaysWorkout
  weeklyVolume: WeeklyVolume[]
  strengthEstimates: StrengthEstimate[]
  weaknesses: GymWeakness[]
  recommendations: GymRecommendation[]
  recentSessions: WorkoutSession[]
  goalProfile: GoalProfile
  equipmentProfile: EquipmentProfile
  injuryProfile: InjuryProfile
  trainingBlock: TrainingBlock
  evidence: GymEvidence[]
  narrative: string
  hasWorkoutHistory: boolean
  sessionsThisWeek: number
  techniqueReviews: TechniqueReview[]
  videoAnalysis: VideoAnalysis[]
  movementAnalysis: MovementAnalysis[]
}

export interface GymInput {
  objects: FounderObject[]
  memories: MemoryRecord[]
  knowledge: KnowledgeRecord[]
  signals: Signal[]
  outcomes: OutcomeHistoryEntry[]
  tasks: Task[]
  projects: Project[]
  decisionOutput?: DecisionOutput | null
  domainIntelligence?: DomainIntelligenceOutput | null
  morningPlan?: MorningExecutionPlan | null
  dailyContext?: DailyContext | null
  eveningReview?: EveningReview | null
  healthSignals?: HealthSignals | null
  worldModel?: WorldModel | null
}

export type GymQuestionId =
  | 'train_today'
  | 'improve'
  | 'progressing'
  | 'muscles_behind'
  | 'what_weight'
  | 'deload'
  | 'routine'
  | 'recovery'
  | 'bench_stuck'
  | 'replace_exercise'
  | 'chest_volume'
  | 'train_tomorrow'

export const GYM_GOAL_LABELS: Record<GymGoal, string> = {
  muscle_growth: 'Muscle Growth',
  strength: 'Strength',
  powerlifting: 'Powerlifting',
  athletic_performance: 'Athletic Performance',
  weight_loss: 'Weight Loss',
  general_fitness: 'General Fitness',
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  front_delts: 'Front Delts',
  side_delts: 'Side Delts',
  rear_delts: 'Rear Delts',
  triceps: 'Triceps',
  biceps: 'Biceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  lower_back: 'Lower Back',
}
