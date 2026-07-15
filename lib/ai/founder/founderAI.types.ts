import type { BeliefTopic } from '@/lib/cognitive-model/beliefTypes'

export type FounderReasoningMode = 'idle' | 'thinking' | 'llm' | 'deterministic'

export type FounderAIResponseMode = 'llm' | 'deterministic'

export type FounderAIErrorCode =
  | 'missing_key'
  | 'invalid_request'
  | 'timeout'
  | 'rate_limit'
  | 'invalid_model_output'
  | 'provider_error'
  | 'disabled'
  | null

export type ProposedBeliefOperation = 'create' | 'update' | 'challenge' | 'confirm'

export type FounderActionType =
  | 'create_task'
  | 'create_sprint'
  | 'defer_item'
  | 'create_capture'
  | 'create_memory_draft'
  | 'create_knowledge_draft'
  | 'update_mission'
  | 'schedule_placeholder'
  | 'WorkoutLogged'
  | 'GoalUpdated'
  | 'MissionUpdated'
  | 'MemoryCreated'
  | 'KnowledgeCreated'
  | 'TaskCreated'
  | 'ProjectCreated'
  | 'RecoveryUpdated'
  | 'WorkoutCompleted'
  | 'RoutineGenerated'
  | 'ValidationLogged'
  | 'UserFeedbackAdded'

export interface CompactEvidenceRef {
  id: string
  sourceType: string
  sourceId?: string
  title: string
  summary: string
  weight: number
  supports: boolean
  evidenceKind?: string
}

export interface CompactBeliefRef {
  id: string
  statement: string
  topic: BeliefTopic
  status: string
  confidence: number
  source: string
  importance: string
}

export interface CompactUnknownRef {
  id: string
  statement: string
  topic: string
  importance: string
}

export interface CompactContradictionRef {
  id: string
  description: string
  beliefAId: string
  beliefBId: string
  resolved: boolean
}

export interface CompactTurnRef {
  id: string
  role: 'user' | 'founder_ai' | 'system'
  content: string
  questionId?: string
  createdAt: string
}

export interface CompactFounderSnapshot {
  currentStage: string
  mainInsight: string
  mainBottleneck: string
  momentumScore: number
  validationScore: number
  executionScore: number
  topRecommendation: string
  risks: string[]
}

export interface CompactWorldModel {
  mission: string
  currentStage: string
  overallConfidence: number
  mainBottleneck: string
  topRisks: string[]
  hypotheses: string[]
}

export interface CompactFounderContext {
  userMessage: string
  conversationSummary: string
  worldModel: CompactWorldModel
  founderSnapshot: CompactFounderSnapshot
  activeBeliefs: CompactBeliefRef[]
  unknowns: CompactUnknownRef[]
  contradictions: CompactContradictionRef[]
  activeQuestion?: {
    id: string
    text: string
    topic: string
  }
  recentTurns: CompactTurnRef[]
  evidence: CompactEvidenceRef[]
  availableActionTypes: FounderActionType[]
}

export interface ProposedBeliefUpdate {
  beliefId?: string
  proposition: string
  operation: ProposedBeliefOperation
  confidenceDelta: number
  rationale: string
  evidenceIds: string[]
}

export interface ProposedContradiction {
  beliefAId: string
  beliefBId: string
  description: string
}

export interface ProposedQuestion {
  text: string
  purpose: string
  answerType: 'yes_no' | 'short_text' | 'open_text' | 'multiple_choice'
  options?: string[]
  targetBeliefId?: string
}

export interface ProposedAction {
  id: string
  type: FounderActionType
  title: string
  description: string
  rationale: string
  confidence: number
  domain: string
  reversible: boolean
  requiresApproval: true
  payload: Record<string, unknown>
}

export interface MemoryDraft {
  id: string
  title: string
  content: string
  tags?: string[]
}

export interface KnowledgeDraft {
  id: string
  title: string
  principle: string
  domain: string
}

export interface FounderAIResponse {
  message: string
  reasoningSummary: string
  confidence: number
  evidenceIds: string[]
  beliefsToUpdate: ProposedBeliefUpdate[]
  contradictionsToCreate: ProposedContradiction[]
  nextQuestion?: ProposedQuestion
  suggestedActions: ProposedAction[]
  memoryDrafts: MemoryDraft[]
  knowledgeDrafts: KnowledgeDraft[]
  usedDeterministicFallback?: boolean
  extractedClaims?: { predicate: string; value: string | number | boolean; confidence: number }[]
  proposedBeliefChanges?: { beliefId: string; previous: string; next: string }[]
  hypotheses?: string[]
  unknowns?: string[]
}

export interface FounderAIRequest {
  context: CompactFounderContext
  sessionId: string
  turnId: string
}

export type FounderProposalStatus = 'pending' | 'approved' | 'dismissed' | 'edited'

export interface FounderProposalBundle {
  id: string
  turnId: string
  sessionId: string
  createdAt: string
  status: FounderProposalStatus
  mode: FounderAIResponseMode
  response: FounderAIResponse
}

export interface FounderAIApiEnvelope {
  requestId: string
  mode: FounderAIResponseMode
  response: FounderAIResponse
  errorCode?: FounderAIErrorCode
  warning?: string
}
