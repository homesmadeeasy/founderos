/**
 * Canonical Intelligence Pipeline contracts.
 * Orchestration only — does not replace Identity, Reality, Memory, Cognitive, etc.
 */

export const INTELLIGENCE_PIPELINE_VERSION = 2

export type IntelligenceSpecialist =
  | 'gym'
  | 'founder'
  | 'school'
  | 'finance'
  | 'health'
  | 'travel'
  | string

export type IntelligenceIntent =
  | 'train_today'
  | 'recovery'
  | 'progression'
  | 'general_question'
  | 'action_followup'
  | string

export type DataScope =
  | 'identity'
  | 'reality'
  | 'memory'
  | 'beliefs'
  | 'knowledge'
  | 'domain_evidence'
  | 'goals'
  | 'decision'
  | 'reasoning'

export type IntelligenceStageId =
  | 'request'
  | 'specialist_intent'
  | 'declared_profile'
  | 'observed_identity'
  | 'reality'
  | 'memory'
  | 'beliefs'
  | 'domain_evidence'
  | 'missing_information'
  | 'reasoning'
  | 'recommendation'
  | 'response'
  | 'post_response_updates'
  /** Legacy aliases kept for existing traces / tests */
  | 'conversation_context'
  | 'identity'
  | 'knowledge'
  | 'goals'
  | 'evidence'
  | 'decision'
  | 'memory_update'
  | 'reality_update'
  | 'identity_observation'

export type StageStatus = 'ok' | 'skipped' | 'degraded' | 'failed' | 'pending'

export type GymReadinessLevel =
  | 'not_ready'
  | 'minimum_ready'
  | 'personalized'
  | 'evidence_rich'

export interface IntelligenceStageTrace {
  id: IntelligenceStageId
  label: string
  status: StageStatus
  detail?: string
  durationMs: number
  sourceSystem?: string
  recordsRetrieved?: number
  duplicateBlocked?: boolean
}

export interface IntelligenceTrace {
  id: string
  requestId: string
  version: number
  specialistId: string
  question: string
  startedAt: string
  finishedAt: string
  durationMs: number
  stages: IntelligenceStageTrace[]
  sourceSystemsUsed: string[]
  recordsRetrieved: number
  skippedStages: IntelligenceStageId[]
  degradedStages: IntelligenceStageId[]
  overallConfidence: number
  warnings: string[]
  notes: string[]
  /** Privacy-safe diagnostic blob for inspector copy */
  sanitizedReport: string
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
  kind?: 'declared' | 'observed' | 'domain' | 'inferred'
  freshness?: 'fresh' | 'stale' | 'unknown'
}

export interface IntelligenceActionRecommendation {
  id: string
  label: string
  rationale: string
  confidence: number
  bounded?: boolean
}

export interface DeclaredProfileField {
  key: string
  label: string
  value: string
  source: 'identity_declared' | 'gym_profile'
}

export interface ObservedIdentityField {
  key: string
  label: string
  value: string
  confidence: number
  contradictionNote?: string
}

export interface IntelligenceContext {
  declaredProfile: DeclaredProfileField[]
  observedIdentity: ObservedIdentityField[]
  realitySnapshot: {
    summary: string
    hints: string[]
    momentumLabel?: string
    eventCountToday?: number
  }
  relevantMemories: IntelligenceMemoryHit[]
  relevantBeliefs: IntelligenceBeliefHit[]
  domainEvidence: IntelligenceEvidenceHit[]
  goals: string[]
  constraints: string[]
  dataFreshness: {
    identity?: string
    reality?: string
    domain?: string
    recovery?: 'fresh' | 'stale' | 'unknown'
  }
  missingInformation: string[]
  readiness?: GymReadinessLevel
  followUpQuestion?: string
}

export interface ProposedUpdate {
  kind: 'identity_observation' | 'reality_event' | 'memory' | 'none'
  summary: string
  applied: boolean
}

/** Canonical request — specialists should pass this shape. */
export interface IntelligenceRequest {
  requestId?: string
  userId?: string
  specialist: IntelligenceSpecialist
  /** @deprecated use specialist */
  specialistId?: string
  intent?: IntelligenceIntent
  userMessage: string
  /** @deprecated use userMessage */
  question?: string
  conversationId?: string
  conversationContext?: string
  timestamp?: string
  permittedDataScopes?: DataScope[]
  readOnly?: boolean
}

export interface IntelligenceResult {
  /** Assembled read model for the specialist */
  responseContext: IntelligenceContext
  recommendations: IntelligenceActionRecommendation[]
  evidence: IntelligenceEvidenceHit[]
  confidence: number
  explanation: string
  missingInformation: string[]
  warnings: string[]
  proposedUpdates: ProposedUpdate[]
  trace: IntelligenceTrace
  /** Final user-facing answer (no developer traces) */
  response: string

  /** Legacy fields (kept for existing callers / inspector) */
  identitySummary: string
  realitySummary: string
  relevantMemories: IntelligenceMemoryHit[]
  relevantBeliefs: IntelligenceBeliefHit[]
  supportingEvidence: IntelligenceEvidenceHit[]
  reasoning: string
  recommendedActions: IntelligenceActionRecommendation[]
  narrativeHints: string[]
}

export type IntelligenceResponsePartial = {
  responseContext: IntelligenceContext
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
  warnings: string[]
  narrativeHints: string[]
  identityHints: string[]
  realityHints: string[]
}

export interface IntelligenceSources {
  identityHints?: string[]
  identitySummary?: string
  declaredProfile?: DeclaredProfileField[]
  observedIdentity?: ObservedIdentityField[]
  realityHints?: string[]
  realitySummary?: string
  realityMomentumLabel?: string
  realityEventCountToday?: number
  memories?: IntelligenceMemoryHit[]
  knowledge?: IntelligenceMemoryHit[]
  beliefs?: IntelligenceBeliefHit[]
  goals?: string[]
  constraints?: string[]
  evidence?: IntelligenceEvidenceHit[]
  domainEvidence?: IntelligenceEvidenceHit[]
  reasoningSummary?: string
  decisionSummary?: string
  executiveRecommendations?: string[]
  dataFreshness?: IntelligenceContext['dataFreshness']
  readiness?: GymReadinessLevel
  followUpQuestion?: string
  produceResponse?: (partial: IntelligenceResponsePartial) => string | Promise<string>
  onMemoryUpdate?: (result: IntelligenceResult) => void | Promise<void>
  onRealityUpdate?: (result: IntelligenceResult) => void | Promise<void>
  onIdentityObservation?: (result: IntelligenceResult) => void | Promise<void>
  readOnly?: boolean
}

/** Canonical stage order (v2) with legacy stage ids still emitted for compatibility traces. */
export const CANONICAL_STAGE_ORDER: IntelligenceStageId[] = [
  'conversation_context',
  'specialist_intent',
  'identity',
  'declared_profile',
  'observed_identity',
  'reality',
  'memory',
  'knowledge',
  'beliefs',
  'goals',
  'domain_evidence',
  'evidence',
  'missing_information',
  'reasoning',
  'decision',
  'recommendation',
  'response',
  'memory_update',
  'reality_update',
  'identity_observation',
  'post_response_updates',
]

export const STAGE_LABELS: Record<IntelligenceStageId, string> = {
  request: 'Request',
  specialist_intent: 'Specialist Intent',
  declared_profile: 'Declared Profile',
  observed_identity: 'Observed Identity',
  reality: 'Current Reality',
  memory: 'Relevant Memories',
  beliefs: 'Beliefs / World Model',
  domain_evidence: 'Specialist Evidence',
  missing_information: 'Missing Information',
  reasoning: 'Reasoning',
  recommendation: 'Bounded Recommendation',
  response: 'Response',
  post_response_updates: 'Approved Post-Response Updates',
  conversation_context: 'Conversation Context',
  identity: 'Identity',
  knowledge: 'Relevant Knowledge',
  goals: 'Goals',
  evidence: 'Evidence',
  decision: 'Decision',
  memory_update: 'Memory Update',
  reality_update: 'Reality Update',
  identity_observation: 'Identity Observation',
}
