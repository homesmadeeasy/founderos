import type { EnergyLevel } from '@/lib/evening-review/eveningTypes'
import type { DecisionArea } from '@/lib/decision-engine/decisionTypes'

export type OutcomeCompleted = 'yes' | 'no' | 'partial'
export type OutcomeQuality = 'poor' | 'neutral' | 'good' | 'excellent'

export interface OutcomePrediction {
  id: string
  date: string
  decisionId: string
  decisionTitle: string
  predictedAction: string
  predictedBenefit: string
  confidenceAtDecision: number
  decisionArea?: DecisionArea
  evidenceIds: string[]
  createdAt: string
}

export interface OutcomeRecord {
  id: string
  date: string
  predictionId: string
  completed: OutcomeCompleted
  outcomeQuality: OutcomeQuality
  actualResult: string
  reflection: string
  energyAfter?: EnergyLevel
  moodAfter?: string
  lessons: string
  createdAt: string
}

export interface OutcomeEvaluation {
  id: string
  predictionId: string
  date: string
  accuracyScore: number
  whatWorked: string
  whatDidNotWork: string
  adjustment: string
  futureWeightChange: number
  confidenceAdjustment: number
  createdAt: string
}

export interface RecordOutcomeInput {
  completed: OutcomeCompleted
  outcomeQuality: OutcomeQuality
  actualResult: string
  reflection?: string
  energyAfter?: EnergyLevel
  moodAfter?: string
  lessons?: string
}

export interface OutcomeStats {
  totalPredictions: number
  totalOutcomes: number
  evaluatedCount: number
  averageAccuracy: number
  successRate: number
  followRate: number
}

export interface SimilarOutcomeMatch {
  prediction: OutcomePrediction
  record?: OutcomeRecord
  evaluation?: OutcomeEvaluation
}

export interface OutcomeStore {
  predictions: OutcomePrediction[]
  records: OutcomeRecord[]
  evaluations: OutcomeEvaluation[]
}

export interface OutcomeHistoryEntry {
  prediction: OutcomePrediction
  record?: OutcomeRecord
  evaluation?: OutcomeEvaluation
}
