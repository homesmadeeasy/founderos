import type { CognitiveStore } from '@/lib/cognitive-model/beliefTypes'
import type { RealitySourceClass } from '@/lib/cognitive-model/realityTypes'
import type { FounderBottleneck } from '@/lib/specialists/founder/founderTypes'
import type { FounderAIResponse } from '@/lib/ai/founder/founderAI.types'
import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import type { ReconciliationResult } from '@/lib/cognitive-model/realityTypes'

export type EvaluationCategory =
  | 'correction_handling'
  | 'contradiction_handling'
  | 'absence_of_evidence'
  | 'evidence_of_absence'
  | 'user_reported_facts'
  | 'ambiguous_statements'
  | 'partial_information'
  | 'confidence_calibration'
  | 'stale_belief_replacement'
  | 'similar_entity_names'
  | 'duplicate_messages'
  | 'idempotency'
  | 'refresh_persistence'
  | 'conversation_continuation'
  | 'unsupported_claims'
  | 'evidence_attribution'
  | 'recommendation_changes'
  | 'unanswered_questions'
  | 'uncertainty_language'
  | 'user_rejects_assumption'
  | 'user_confirms_assumption'
  | 'conflicting_statements'
  | 'outcomes_strategy'
  | 'memory_state_conflict'
  | 'misleading_keywords'
  | 'irrelevant_information'
  | 'malformed_storage'
  | 'storage_quota'
  | 'provider_tree'
  | 'llm_fallback'

export type EvaluationSeverity = 'normal' | 'critical'

export type EvaluationDimension =
  | 'factualConsistency'
  | 'beliefUpdating'
  | 'evidenceGrounding'
  | 'uncertaintyHonesty'
  | 'recommendationRelevance'
  | 'questionQuality'
  | 'persistence'
  | 'idempotency'
  | 'safety'

export const EVALUATION_DIMENSIONS: EvaluationDimension[] = [
  'factualConsistency',
  'beliefUpdating',
  'evidenceGrounding',
  'uncertaintyHonesty',
  'recommendationRelevance',
  'questionQuality',
  'persistence',
  'idempotency',
  'safety',
]

export interface EvaluationInitialState {
  store?: CognitiveStore
  seedMessage?: string
}

export interface EvaluationTurn {
  userMessage: string
  kind?: 'reconcile' | 'query' | 'repeat_previous'
  repeatTurnIndex?: number
}

export interface BeliefExpectation {
  predicate: string
  normalizedValue?: string
  minConfidence?: number
  maxConfidence?: number
  sourceClassification?: RealitySourceClass
  mustExist?: boolean
  mustNotExist?: boolean
}

export interface QueryExpectation {
  prompt: string
  mustInclude?: string[]
  mustNotInclude?: string[]
}

export interface EvaluationExpectations {
  beliefs?: BeliefExpectation[]
  validationScoreMin?: number
  validationScoreMax?: number
  positioningRiskMin?: number
  positioningRiskMax?: number
  bottleneck?: FounderBottleneck | FounderBottleneck[]
  bottleneckNot?: FounderBottleneck | FounderBottleneck[]
  recommendationIncludes?: string[]
  recommendationExcludes?: string[]
  nextQuestionIncludes?: string[]
  nextQuestionExcludes?: string[]
  contradictionCountMin?: number
  unknownCountMin?: number
  changesCountMin?: number
  changesCountMax?: number
  forbiddenClaimPhrases?: string[]
  forbiddenOutputs?: string[]
  uncertaintyInResponse?: boolean
  uncertaintyInQuery?: boolean
  persistAfterRefresh?: boolean
  cognitiveQuery?: QueryExpectation
  supersededHistoryRetained?: boolean
  evidenceForPredicate?: string
  idempotentOnFinalTurn?: boolean
  llmMustUseFallback?: boolean
}

export interface EvaluationScenario {
  id: string
  title: string
  category: EvaluationCategory
  severity?: EvaluationSeverity
  initialState?: EvaluationInitialState
  turns: EvaluationTurn[]
  expected: EvaluationExpectations
  /** Dimensions weighted higher when this scenario fails */
  criticalDimensions?: EvaluationDimension[]
}

export interface EvaluationAssertionFailure {
  id: string
  message: string
  severity: EvaluationSeverity
  dimension: EvaluationDimension
  expected?: string
  actual?: string
}

export interface EvaluationTurnTrace {
  turnIndex: number
  userMessage: string
  kind: EvaluationTurn['kind']
  reconciliation?: {
    idempotent: boolean
    changesCount: number
    claimsCount: number
    validationDelta: number
    evidenceIds: string[]
    beliefPredicates: string[]
  }
  responseSnippet?: string
  queryAnswer?: string
  founderSnapshot?: {
    bottleneck: string
    recommendation: string
    validationScore: number
  }
  durationMs: number
}

export interface EvaluationScenarioResult {
  scenarioId: string
  title: string
  category: EvaluationCategory
  severity: EvaluationSeverity
  passed: boolean
  criticalFailed: boolean
  score: number
  dimensionScores: Record<EvaluationDimension, number>
  assertionFailures: EvaluationAssertionFailure[]
  traces: EvaluationTurnTrace[]
  durationMs: number
  snapshotHash: string
  actualState: {
    beliefs: Array<{ predicate: string; normalizedValue: string; confidence: number }>
    contradictionCount: number
    validationScore: number
    bottleneck: string
    recommendation: string
    nextQuestion: string
  }
  lastResponse?: FounderAIResponse
  lastReconciliation?: ReconciliationResult
  lastFounderSnapshot?: FounderSnapshot
}

export interface EvaluationReport {
  id: string
  runAt: string
  durationMs: number
  overallScore: number
  dimensionScores: Record<EvaluationDimension, number>
  passed: number
  failed: number
  criticalFailures: number
  scenarioResults: EvaluationScenarioResult[]
  previousRunComparison?: {
    previousScore: number
    delta: number
    previousRunAt: string
  }
}

export interface EvaluationSummary {
  id: string
  runAt: string
  overallScore: number
  dimensionScores: Record<EvaluationDimension, number>
  passed: number
  failed: number
  criticalFailures: number
  durationMs: number
}
