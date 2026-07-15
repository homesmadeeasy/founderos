export type FounderEventType =
  | 'CaptureCreated'
  | 'CaptureProcessed'
  | 'SignalCreated'
  | 'SignalProcessed'
  | 'ObjectCreated'
  | 'ObjectUpdated'
  | 'ObjectCompleted'
  | 'MemoryCreated'
  | 'KnowledgeCreated'
  | 'DecisionGenerated'
  | 'DecisionAccepted'
  | 'DecisionRejected'
  | 'OutcomeRecorded'
  | 'MorningStarted'
  | 'MorningCompleted'
  | 'EveningStarted'
  | 'EveningCompleted'
  | 'CalendarSynced'
  | 'WorkoutCompleted'
  | 'StudyCompleted'
  | 'UserAskedQuestion'
  | 'UserReflectionAdded'
  | 'ConversationStarted'
  | 'ConversationAnswered'
  | 'ConversationFinished'
  | 'ConversationAbandoned'
  | 'ConversationSummaryCreated'
  | 'ConversationMemoryCreated'
  | 'ConversationKnowledgeSuggested'
  | 'ConversationDecisionUpdated'
  | 'CognitiveModelUpdated'
  | 'FounderAIRequested'
  | 'FounderAIResponded'
  | 'FounderAIResponseFailed'
  | 'FounderProposalCreated'
  | 'FounderProposalApproved'
  | 'FounderProposalEdited'
  | 'FounderProposalDismissed'
  | 'RealityEvidenceReceived'
  | 'RealityBeliefUpdated'
  | 'RealityContradictionDetected'
  | 'RealityHypothesisCreated'
  | 'RealityUnknownCreated'
  | 'RealityModelReconciled'
  | 'RealityCompacted'

export type FounderEventStatus =
  | 'created'
  | 'queued'
  | 'dispatching'
  | 'completed'
  | 'archived'
  | 'failed'

export type KernelSubscriberResultStatus = 'success' | 'failure' | 'skipped'

export interface FounderEvent {
  id: string
  type: FounderEventType
  source: string
  timestamp: string
  payload: Record<string, unknown>
  metadata?: Record<string, unknown>
  correlationId?: string
  causationId?: string
  status: FounderEventStatus
}

export interface KernelSubscriber {
  id: string
  name: string
  priority: number
  subscribedEvents: FounderEventType[]
  handler: (event: FounderEvent) => void | Promise<void>
}

export interface KernelSubscriberResult {
  subscriberId: string
  subscriberName: string
  status: KernelSubscriberResultStatus
  durationMs: number
  error?: string
}

export interface KernelExecution {
  eventId: string
  eventType: FounderEventType
  startedAt: string
  finishedAt: string
  durationMs: number
  subscriberCount: number
  subscriberResults: KernelSubscriberResult[]
  success: boolean
  failureCount: number
}

export interface KernelHistoryEntry {
  id: string
  timestamp: string
  eventType: FounderEventType
  source: string
  eventId: string
  subscriberCount: number
  durationMs: number
  success: boolean
  failureCount: number
  payloadSummary?: string
}

export interface PublishEventInput {
  type: FounderEventType
  source: string
  payload?: Record<string, unknown>
  metadata?: Record<string, unknown>
  correlationId?: string
  causationId?: string
}
