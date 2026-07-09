import type { EveningReview } from '@/lib/evening-review/eveningTypes'
import type { ExecutiveRecommendation, HealthSignals } from '@/lib/executive-engine/executiveTypes'
import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { MorningExecutionPlan } from '@/lib/morning-execution/morningTypes'
import type { FounderObject, LifeArea } from '@/lib/object-engine/objectTypes'
import type { DailyReasoningOutput } from '@/lib/reasoning-engine/reasoningTypes'
import type { Signal } from '@/lib/signal-engine/signalTypes'
import type { DomainCoordinatorOutput } from '@/lib/domain-intelligence/domainTypes'

export type DecisionArea = LifeArea | 'inbox' | 'recovery' | 'planning'
export type DecisionUrgency = 'critical' | 'high' | 'medium' | 'low'
export type DecisionImportance = 'critical' | 'high' | 'medium' | 'low'
export type ConfidenceLabel = 'low' | 'medium' | 'high'

export type EvidenceSourceType =
  | 'object'
  | 'memory'
  | 'knowledge'
  | 'signal'
  | 'morning'
  | 'evening'
  | 'executive'

export interface Decision {
  id: string
  title: string
  action: string
  area: DecisionArea
  urgency: DecisionUrgency
  importance: DecisionImportance
  estimatedMinutes?: number
  reason: string
  confidence: ConfidenceLabel
  relatedObjectIds: string[]
  relatedMemoryIds: string[]
  relatedKnowledgeIds: string[]
  relatedSignalIds: string[]
}

export interface DecisionEvidence {
  sourceType: EvidenceSourceType
  sourceId: string
  title: string
  summary: string
  weight: number
  supports: boolean
  conflicts: boolean
}

export interface DecisionTradeoff {
  optionA: string
  optionB: string
  recommendation: string
  reason: string
}

export interface ScoreBreakdown {
  importance: number
  urgency: number
  strategicAlignment: number
  timeSensitivity: number
  riskReduction: number
  momentum: number
  healthImpact: number
  deadlinePressure: number
  overloadPenalty: number
  conflictPenalty: number
  lowConfidencePenalty: number
  total: number
}

export interface ExecutiveStateInput {
  recommendations: ExecutiveRecommendation[]
  warnings: string[]
  tradeoffs: string[]
  healthSignals?: HealthSignals | null
}

export interface DecisionInput {
  objects: FounderObject[]
  memories: MemoryRecord[]
  knowledge: KnowledgeRecord[]
  signals: Signal[]
  morningPlan: MorningExecutionPlan | null
  eveningReview: EveningReview | null
  executiveState: ExecutiveStateInput
  currentTime: string
  reasoningOutput?: DailyReasoningOutput | null
  unresolvedCaptureCount?: number
  domainCoordinator?: DomainCoordinatorOutput | null
}

export interface DecisionOutput {
  id: string
  createdAt: string
  primaryDecision: Decision
  secondaryDecisions: Decision[]
  ignoreToday: string[]
  risks: string[]
  opportunities: string[]
  confidence: number
  confidenceLabel: ConfidenceLabel
  evidence: DecisionEvidence[]
  explanation: string
  tradeoffs: DecisionTradeoff[]
}

export interface CandidateAction {
  id: string
  title: string
  action: string
  area: DecisionArea
  urgency: DecisionUrgency
  importance: DecisionImportance
  estimatedMinutes?: number
  reason: string
  relatedObjectIds: string[]
  relatedMemoryIds: string[]
  relatedKnowledgeIds: string[]
  relatedSignalIds: string[]
  tags: string[]
}
