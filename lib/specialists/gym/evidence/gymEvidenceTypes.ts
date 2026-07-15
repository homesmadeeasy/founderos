import type { GymGoal, MuscleGroup } from '../gymTypes'

export type EvidenceLevel = 'guideline' | 'systematic_review' | 'meta_analysis' | 'rct' | 'expert_consensus'

export type SourceStatus = 'approved' | 'provisional' | 'outdated' | 'rejected'

export type GymPopulation =
  | 'general_adults'
  | 'beginners'
  | 'intermediate_lifters'
  | 'advanced_lifters'
  | 'older_adults'
  | 'clinical_population'

export type TrainingGoal =
  | 'muscle_growth'
  | 'strength'
  | 'powerlifting'
  | 'athletic_performance'
  | 'weight_loss'
  | 'general_fitness'
  | 'health_maintenance'

export type PrescriptionVariable =
  | 'sets_per_exercise'
  | 'weekly_sets_per_muscle'
  | 'rep_range'
  | 'load_percent_1rm'
  | 'rpe'
  | 'rir'
  | 'rest_interval'
  | 'frequency'
  | 'proximity_to_failure'
  | 'exercise_order'
  | 'progression'
  | 'deloading'

export type PublicationType =
  | 'position_stand'
  | 'guideline'
  | 'systematic_review'
  | 'meta_analysis'
  | 'consensus_statement'
  | 'fact_sheet'

export interface GymResearchSource {
  id: string
  title: string
  authorsOrOrganisation: string
  year: number
  publicationType: PublicationType
  url?: string
  doi?: string
  reviewedAt: string
  supersededBy?: string
  status: SourceStatus
  population: GymPopulation[]
  outcomes: string[]
  limitations: string[]
  evidenceQuality: EvidenceLevel
  summary: string
}

export interface GymEvidenceClaim {
  id: string
  sourceId: string
  variable: PrescriptionVariable
  goals: TrainingGoal[]
  populations: GymPopulation[]
  muscles?: MuscleGroup[]
  claim: string
  valueRange?: { min?: number; max?: number; unit?: string; text?: string }
  evidenceLevel: EvidenceLevel
  status: SourceStatus
  tags: string[]
}

export interface ApplicabilityResult {
  claimId: string
  applicable: boolean
  score: number
  reasons: string[]
  warnings: string[]
}

export interface GymResearchCitation {
  sourceId: string
  title: string
  authorsOrOrganisation: string
  year: number
  url?: string
  doi?: string
  status: SourceStatus
  reviewedAt: string
  isOutdated: boolean
}

export interface PrescriptionRationale {
  personalReason: string
  researchBasis: string
  assumptions: string[]
  confidence: number
  progressionRule: string
  deloadRule: string
  citations: GymResearchCitation[]
  missingDataForPersonalisation: string[]
  safetyNotes: string[]
}

export type PrescriptionMode = 'evidence_informed' | 'fallback'

export type EstimatedLoadMethod = 'rpe_based' | 'percentage_1rm' | 'bodyweight' | 'unspecified'

export interface WorkoutExercisePrescription {
  exerciseId: string
  sets: number
  repRange: string
  targetReps: number
  targetRPE?: number
  targetRIR?: number
  restSeconds: number
  estimatedLoadMethod: EstimatedLoadMethod
  tempo?: string
  progressionRule: string
  deloadRule: string
  goal: GymGoal
  prescriptionConfidence: number
  prescriptionMode: PrescriptionMode
  researchClaimIds: string[]
  userEvidenceIds: string[]
  assumptions: string[]
  contraindicationFlags: string[]
  rationale: string
  explanation: PrescriptionRationale
}

export interface WorkoutResearchSummary {
  methodology: string
  approvedSourceIds: string[]
  averageConfidence: number
  evidenceInformedCount: number
  fallbackCount: number
  reviewedAt: string
}

export interface PrescriptionContext {
  goal: GymGoal
  experience: 'beginner' | 'intermediate' | 'advanced'
  hasWorkoutHistory: boolean
  sessionsThisWeek: number
  recoveryStatus: 'ready' | 'train_light' | 'recover' | 'deload'
  weeklyMuscleSets: number
  muscle: MuscleGroup
  injuryAreas: string[]
  painFlags: string[]
  equipmentLimited: boolean
  shortSession: boolean
  userEvidenceIds: string[]
  estimated1RM?: number | null
  recentReps?: number | null
  recentWeight?: number | null
  sleepHours?: number | null
  sorenessFlag?: boolean
}

export const EVIDENCE_REVIEW_STALE_MONTHS = 24
