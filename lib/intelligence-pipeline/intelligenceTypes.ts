/**
 * Canonical Intelligence Pipeline — shared types.
 * Orchestration only: does not replace Identity, Reality, Memory, Cognitive, etc.
 */

export const INTELLIGENCE_PIPELINE_VERSION = 1

export type IntelligenceStageId =
  | 'conversation_context'
  | 'identity'
  | 'reality'
  | 'memory'
  | 'knowledge'
  | 'beliefs'
  | 'goals'
  | 'evidence'
  | 'reasoning'
  | 'decision'
  | 'recommendation'
  | 'response'
  | 'memory_update'
  | 'reality_update'
  | 'identity_observation'

export type StageStatus = 'ok' | 'skipped' | 'degraded' | 'failed' | 'pending'

export interface IntelligenceStageTrace {
  id: IntelligenceStageId
  label: string
  status: StageStatus
  detail?: string
  durationMs: number
  /** True when this stage was attempted more than once in the same run (blocked). */
  duplicateBlocked?: boolean
}

export interface IntelligenceTrace {
  id: string
  version: number
  specialistId: string
  question: string
  startedAt: string
  finishedAt: string
  durationMs: number
  stages: IntelligenceStageTrace[]
  overallConfidence: number
  notes: string[]
}

export interface IntelligenceMemoryHit {
  id: string
  title: string
  summary: string
}

export interface IntelligenceBeliefHit {
  id: string
  statement: string
  confidence: number
  topic?: string
}

export interface IntelligenceEvidenceHit {
  id: string
  title: string
  summary: string
  weight: number
  source: string
}

export interface IntelligenceActionRecommendation {
  id: string
  label: string
  rationale: string
  confidence: number
}

/** Standard output — every specialist must consume this shape. */
export interface IntelligenceResult {
  identitySummary: string
  realitySummary: string
  relevantMemories: IntelligenceMemoryHit[]
  relevantBeliefs: IntelligenceBeliefHit[]
  supportingEvidence: IntelligenceEvidenceHit[]
  reasoning: string
  confidence: number
  recommendedActions: IntelligenceActionRecommendation[]
  explanation: string
  missingInformation: string[]
  /** Specialist-authored answer text when a response stage ran. */
  response: string
  trace: IntelligenceTrace
  /** Narrative hints suitable for prompt prefixes. */
  narrativeHints: string[]
}

export type IntelligenceResponsePartial = Omit<IntelligenceResult, 'response' | 'trace'> & {
  narrativeHints: string[]
  identityHints: string[]
  realityHints: string[]
}

export interface IntelligenceRequest {
  specialistId: string
  question: string
  conversationContext?: string
}

/**
 * Optional source bag — inject what is available.
 * Missing sources degrade gracefully (stage skipped), never throw the whole pipeline.
 */
export interface IntelligenceSources {
  identityHints?: string[]
  identitySummary?: string
  realityHints?: string[]
  realitySummary?: string
  memories?: IntelligenceMemoryHit[]
  knowledge?: IntelligenceMemoryHit[]
  beliefs?: IntelligenceBeliefHit[]
  goals?: string[]
  evidence?: IntelligenceEvidenceHit[]
  reasoningSummary?: string
  decisionSummary?: string
  executiveRecommendations?: string[]
  /** Specialist answer function — receives partial result before response stage finalizes. */
  produceResponse?: (partial: IntelligenceResponsePartial) => string | Promise<string>
  /** Post-hooks (mutations stay in existing engines). */
  onMemoryUpdate?: (result: IntelligenceResult) => void | Promise<void>
  onRealityUpdate?: (result: IntelligenceResult) => void | Promise<void>
  onIdentityObservation?: (result: IntelligenceResult) => void | Promise<void>
  /** Skip write-back stages (read-only inspector runs). */
  readOnly?: boolean
}

export const CANONICAL_STAGE_ORDER: IntelligenceStageId[] = [
  'conversation_context',
  'identity',
  'reality',
  'memory',
  'knowledge',
  'beliefs',
  'goals',
  'evidence',
  'reasoning',
  'decision',
  'recommendation',
  'response',
  'memory_update',
  'reality_update',
  'identity_observation',
]

export const STAGE_LABELS: Record<IntelligenceStageId, string> = {
  conversation_context: 'Conversation Context',
  identity: 'Identity',
  reality: 'Reality Snapshot',
  memory: 'Memory Retrieval',
  knowledge: 'Relevant Knowledge',
  beliefs: 'Beliefs',
  goals: 'Goals',
  evidence: 'Evidence',
  reasoning: 'Reasoning',
  decision: 'Decision',
  recommendation: 'Recommendation',
  response: 'Response',
  memory_update: 'Memory Update',
  reality_update: 'Reality Update',
  identity_observation: 'Identity Observation',
}
