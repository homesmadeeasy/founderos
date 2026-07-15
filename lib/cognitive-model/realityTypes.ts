import type { Belief, BeliefContradiction, BeliefEvidence, BeliefTopic, Hypothesis, Unknown, WorldModel } from './beliefTypes'

export type RealitySourceClass =
  | 'inferred'
  | 'user_reported'
  | 'externally_verified'
  | 'system_observed'
  | 'contradicted'
  | 'superseded'
  | 'uncertain'
  | 'stale'

export type RealityBeliefStatus =
  | 'confirmed'
  | 'likely'
  | 'possible'
  | 'unknown'
  | 'contradicted'
  | 'superseded'
  | 'uncertain'
  | 'stale'

export interface RealityEntity {
  id: string
  label: string
  domain: BeliefTopic
  aliases: string[]
}

export interface RealityClaim {
  id: string
  predicate: string
  entityId?: string
  value: string | number | boolean
  confidence: number
  source: RealitySourceClass
  rawText: string
  recordedAt: string
}

export interface RealityEvidence extends BeliefEvidence {
  claimId?: string
  sourceClass: RealitySourceClass
  staleAt?: string
  superseded?: boolean
}

export interface RealityBelief extends Belief {
  domain: BeliefTopic
  entityId?: string
  predicate: string
  normalizedValue: string
  sourceClassification: RealitySourceClass
  staleAt?: string
  supersededAt?: string
}

export interface RealityUnknown extends Unknown {
  domain: BeliefTopic
  valueScore: number
}

export interface RealityHypothesis extends Hypothesis {
  domain: BeliefTopic
}

export interface RealityChange {
  id: string
  beliefId: string
  previousStatement: string
  newStatement: string
  previousConfidence: number
  newConfidence: number
  previousStatus: string
  newStatus: string
  evidenceIds: string[]
  reason: string
  timestamp: string
  domain: BeliefTopic
}

export interface RealityDomainSummary {
  domain: BeliefTopic
  headline: string
  confidence: number
  primaryRisk?: string
}

export interface RealitySnapshot {
  updatedAt: string
  entities: RealityEntity[]
  activeBeliefs: RealityBelief[]
  highestImpactChanges: RealityChange[]
  biggestUnknowns: RealityUnknown[]
  contradictions: BeliefContradiction[]
  hypotheses: RealityHypothesis[]
  domainSummaries: RealityDomainSummary[]
  validationScore: number
  positioningRisk: number
}

export interface RealityStoreMeta {
  version: 2
  processedMessageKeys: string[]
  lastCompactionAt: string | null
  approximateBytes: number
  droppedArchiveCount: number
}

export interface ReconciliationResult {
  store: import('./beliefTypes').CognitiveStore
  snapshot: RealitySnapshot
  claims: RealityClaim[]
  changes: RealityChange[]
  hypotheses: RealityHypothesis[]
  unknowns: RealityUnknown[]
  nextQuestion: string
  nextQuestionPurpose: string
  responseMessage: string
  reasoningSummary: string
  idempotent: boolean
  validationDelta: number
  positioningDelta: number
}

export interface UserEvidenceInput {
  userMessage: string
  sessionId: string
  messageId: string
  source?: RealitySourceClass
}
