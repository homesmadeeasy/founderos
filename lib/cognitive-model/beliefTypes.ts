export type BeliefStatus = 'confirmed' | 'likely' | 'possible' | 'unknown' | 'contradicted'

export type BeliefImportance = 'low' | 'medium' | 'high' | 'critical'

export type BeliefSource =
  | 'system_inference'
  | 'conversation'
  | 'memory'
  | 'signal'
  | 'outcome'
  | 'knowledge'
  | 'decision'
  | 'user_statement'
  | 'hypothesis'

export type BeliefTopic =
  | 'vision'
  | 'mission'
  | 'founder'
  | 'validation'
  | 'execution'
  | 'product'
  | 'health'
  | 'learning'
  | 'relationships'
  | 'finance'
  | 'strategy'
  | 'general'

export interface BeliefEvidence {
  id: string
  sourceType: BeliefSource
  sourceId?: string
  title: string
  summary: string
  weight: number
  supports: boolean
  recordedAt: string
}

export interface BeliefHistoryEntry {
  id: string
  timestamp: string
  previousStatus: BeliefStatus
  newStatus: BeliefStatus
  previousConfidence: number
  newConfidence: number
  reason: string
  triggerEvent?: string
}

export interface Belief {
  id: string
  topic: BeliefTopic
  statement: string
  confidence: number
  status: BeliefStatus
  importance: BeliefImportance
  source: BeliefSource
  createdAt: string
  updatedAt: string
  lastReferenced: string
  supportingEvidence: BeliefEvidence[]
  contradictingEvidence: BeliefEvidence[]
  history: BeliefHistoryEntry[]
}

export interface Hypothesis {
  id: string
  statement: string
  topic: BeliefTopic
  confidence: number
  status: 'open' | 'supported' | 'rejected' | 'inconclusive'
  evidenceFor: string[]
  evidenceAgainst: string[]
  createdAt: string
  updatedAt: string
}

export interface Unknown {
  id: string
  statement: string
  topic: BeliefTopic
  importance: BeliefImportance
  relatedBeliefIds: string[]
  createdAt: string
}

export interface CognitiveQuestion {
  id: string
  text: string
  topic: BeliefTopic
  targetBeliefId?: string
  targetUnknownId?: string
  targetHypothesisId?: string
  uncertaintyReduction: number
  reason: string
}

export interface BeliefContradiction {
  id: string
  beliefAId: string
  beliefBId: string
  description: string
  detectedAt: string
  resolved: boolean
}

export interface CognitiveDimension {
  label: string
  score: number
  confidence: number
  summary: string
}

export interface WorldModel {
  vision: string
  mission: string
  values: string[]
  currentStage: string
  momentum: CognitiveDimension
  execution: CognitiveDimension
  validation: CognitiveDimension
  health: CognitiveDimension
  learning: CognitiveDimension
  relationships: CognitiveDimension
  finance: CognitiveDimension
  unknowns: Unknown[]
  openQuestions: CognitiveQuestion[]
  currentRisks: string[]
  currentHypotheses: Hypothesis[]
  currentBottlenecks: string[]
  confidenceLevels: Record<string, number>
  beliefs: Belief[]
  contradictions: BeliefContradiction[]
  updatedAt: string
}

export interface CognitiveStore {
  worldModel: WorldModel
  timeline: CognitiveTimelineEntry[]
  lastKernelSyncAt: string | null
}

export interface CognitiveTimelineEntry {
  id: string
  type: 'belief_updated' | 'hypothesis' | 'contradiction' | 'question' | 'unknown_resolved' | 'kernel'
  title: string
  detail: string
  timestamp: string
  relatedIds: string[]
}

export interface CognitiveInsight {
  currentBelief: string
  biggestUnknown: string
  highestRisk: string
  topQuestion: string
  confidenceShift?: string
}

export interface NormalizedMemoryEvidence {
  id: string
  title: string
  content: string
  type: string
  source: string
  createdAt: string
}

export interface NormalizedSignalEvidence {
  id: string
  title: string
  summary: string
  type: string
  source: string
  createdAt: string
}

export interface NormalizedOutcomeEvidence {
  id: string
  title: string
  summary: string
  supports: boolean
  confidence: number
  source: string
  createdAt: string
}

export interface NormalizedKnowledgeEvidence {
  id: string
  title: string
  content: string
  domain: string
  source: string
  createdAt: string
}

export interface NormalizedConversationBelief {
  key: string
  label: string
  displayValue: string
  status: string
  confidence: number
}

export interface NormalizedFounderSnapshot {
  mainInsight: string
  mainBottleneck: string
  momentumScore: number
  validationScore: number
  architectureScore: number
  executionScore: number
  currentStage: string
  topRecommendation: string
  risks: { title: string; description: string; severity: string }[]
}

/** Fully normalized input used inside cognitive processing. */
export interface NormalizedCognitiveInput {
  founderSnapshot: NormalizedFounderSnapshot | null
  mission: string
  memories: NormalizedMemoryEvidence[]
  signals: NormalizedSignalEvidence[]
  outcomes: NormalizedOutcomeEvidence[]
  knowledge: NormalizedKnowledgeEvidence[]
  conversationBeliefs: NormalizedConversationBelief[]
  decisionSummary: string
}

/** Boundary input from engines/providers — may be partial or legacy-shaped. */
export type RawCognitiveInput = {
  founderSnapshot?: Partial<NormalizedFounderSnapshot> | null
  mission?: string | null
  memories?: unknown
  signals?: unknown
  outcomes?: unknown
  knowledge?: unknown
  conversationBeliefs?: unknown
  decisionSummary?: string | null
  objects?: unknown
  decisions?: unknown
  conversations?: unknown
  captures?: unknown
  domainEvaluations?: unknown
  kernelEvents?: unknown
  morningPlan?: unknown
}

/** @deprecated Use RawCognitiveInput at boundaries and NormalizedCognitiveInput internally. */
export interface CognitiveInput extends RawCognitiveInput {}

export interface BeliefUpdateResult {
  belief: Belief
  historyEntry: BeliefHistoryEntry
  contradictions: BeliefContradiction[]
  newQuestions: CognitiveQuestion[]
  resolvedUnknowns: string[]
}
