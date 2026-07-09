import type { DecisionOutput } from '@/lib/decision-engine/decisionTypes'
import type { EveningReview } from '@/lib/evening-review/eveningTypes'
import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { MorningExecutionPlan } from '@/lib/morning-execution/morningTypes'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type { OutcomeHistoryEntry } from '@/lib/outcome-engine/outcomeTypes'
import type { Signal } from '@/lib/signal-engine/signalTypes'
import type { HealthSignals } from '@/lib/executive-engine/executiveTypes'

export type DomainId =
  | 'founder'
  | 'school'
  | 'health'
  | 'finance'
  | 'relationships'
  | 'personal_growth'
  | 'systems'

export type DomainStatus = 'excellent' | 'good' | 'needs_attention' | 'at_risk' | 'unknown'
export type DomainPriority = 'low' | 'medium' | 'high' | 'critical'

export interface DomainDefinition {
  id: DomainId
  name: string
  description: string
  keywords: string[]
  objectAreas: string[]
  signalTypes: string[]
  knowledgeDomains: string[]
  priorityWeight: number
}

export type DomainEvidenceSourceType =
  | 'object'
  | 'memory'
  | 'knowledge'
  | 'signal'
  | 'decision'
  | 'outcome'
  | 'morning'
  | 'evening'

export interface DomainEvidence {
  sourceType: DomainEvidenceSourceType
  sourceId: string
  title: string
  summary: string
  weight: number
  supports: boolean
  conflicts: boolean
}

export interface DomainEvaluation {
  id: string
  domainId: DomainId
  domainName: string
  createdAt: string
  status: DomainStatus
  score: number
  priority: DomainPriority
  recommendation: string
  nextAction: string
  risks: string[]
  opportunities: string[]
  evidence: DomainEvidence[]
  confidence: number
  relatedObjectIds: string[]
  relatedMemoryIds: string[]
  relatedKnowledgeIds: string[]
  relatedSignalIds: string[]
  relatedOutcomeIds: string[]
}

export interface DomainCoordinatorOutput {
  createdAt: string
  evaluations: DomainEvaluation[]
  topDomain: DomainId
  topDomainName: string
  neglectedDomains: DomainId[]
  conflictedDomains: DomainId[]
  globalRecommendation: string
  tradeoffs: string[]
  confidence: number
  explanation: string
}

export interface DomainEvaluationInput {
  objects: FounderObject[]
  memories: MemoryRecord[]
  knowledge: KnowledgeRecord[]
  signals: Signal[]
  outcomes: OutcomeHistoryEntry[]
  morningPlan: MorningExecutionPlan | null
  eveningReview: EveningReview | null
  decisionOutput: DecisionOutput | null
  unresolvedCaptureCount?: number
  healthSignals?: HealthSignals | null
}

export interface DomainIntelligenceOutput {
  evaluations: DomainEvaluation[]
  coordinator: DomainCoordinatorOutput
}
