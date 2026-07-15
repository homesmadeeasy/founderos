import type { FounderEventType } from './kernelTypes'

export const FOUNDER_EVENT_TYPES: FounderEventType[] = [
  'CaptureCreated',
  'CaptureProcessed',
  'SignalCreated',
  'SignalProcessed',
  'ObjectCreated',
  'ObjectUpdated',
  'ObjectCompleted',
  'MemoryCreated',
  'KnowledgeCreated',
  'DecisionGenerated',
  'DecisionAccepted',
  'DecisionRejected',
  'OutcomeRecorded',
  'MorningStarted',
  'MorningCompleted',
  'EveningStarted',
  'EveningCompleted',
  'CalendarSynced',
  'WorkoutCompleted',
  'WorkoutLogged',
  'ExercisePR',
  'RecoveryUpdated',
  'WeeklyVolumeUpdated',
  'RoutineGenerated',
  'GoalChanged',
  'StudyCompleted',
  'UserAskedQuestion',
  'UserReflectionAdded',
  'ConversationStarted',
  'ConversationAnswered',
  'ConversationFinished',
  'ConversationAbandoned',
  'ConversationSummaryCreated',
  'ConversationMemoryCreated',
  'ConversationKnowledgeSuggested',
  'ConversationDecisionUpdated',
  'CognitiveModelUpdated',
  'FounderAIRequested',
  'FounderAIResponded',
  'FounderAIResponseFailed',
  'FounderProposalCreated',
  'FounderProposalApproved',
  'FounderProposalEdited',
  'FounderProposalDismissed',
  'RealityEvidenceReceived',
  'RealityBeliefUpdated',
  'RealityContradictionDetected',
  'RealityHypothesisCreated',
  'RealityUnknownCreated',
  'RealityModelReconciled',
  'RealityCompacted',
  'FounderEvaluationStarted',
  'FounderEvaluationScenarioCompleted',
  'FounderEvaluationCompleted',
  'FounderEvaluationCriticalFailure',
  'ActionProposed',
  'ActionApproved',
  'ActionRejected',
  'ActionExecuted',
  'ActionFailed',
]

export const EVENT_TYPE_LABELS: Record<FounderEventType, string> = {
  CaptureCreated: 'Capture created',
  CaptureProcessed: 'Capture processed',
  SignalCreated: 'Signal created',
  SignalProcessed: 'Signal processed',
  ObjectCreated: 'Object created',
  ObjectUpdated: 'Object updated',
  ObjectCompleted: 'Object completed',
  MemoryCreated: 'Memory created',
  KnowledgeCreated: 'Knowledge created',
  DecisionGenerated: 'Decision generated',
  DecisionAccepted: 'Decision accepted',
  DecisionRejected: 'Decision rejected',
  OutcomeRecorded: 'Outcome recorded',
  MorningStarted: 'Morning started',
  MorningCompleted: 'Morning completed',
  EveningStarted: 'Evening started',
  EveningCompleted: 'Evening completed',
  CalendarSynced: 'Calendar synced',
  WorkoutCompleted: 'Workout completed',
  WorkoutLogged: 'Workout logged',
  ExercisePR: 'Exercise personal record',
  RecoveryUpdated: 'Recovery status updated',
  WeeklyVolumeUpdated: 'Weekly volume updated',
  RoutineGenerated: 'Training routine generated',
  GoalChanged: 'Training goal changed',
  StudyCompleted: 'Study completed',
  UserAskedQuestion: 'User asked question',
  UserReflectionAdded: 'User reflection added',
  ConversationStarted: 'Conversation started',
  ConversationAnswered: 'Conversation answered',
  ConversationFinished: 'Conversation finished',
  ConversationAbandoned: 'Conversation abandoned',
  ConversationSummaryCreated: 'Conversation summary created',
  ConversationMemoryCreated: 'Conversation memory created',
  ConversationKnowledgeSuggested: 'Conversation knowledge suggested',
  ConversationDecisionUpdated: 'Conversation decision updated',
  CognitiveModelUpdated: 'Cognitive model updated',
  FounderAIRequested: 'Founder AI requested',
  FounderAIResponded: 'Founder AI responded',
  FounderAIResponseFailed: 'Founder AI response failed',
  FounderProposalCreated: 'Founder proposal created',
  FounderProposalApproved: 'Founder proposal approved',
  FounderProposalEdited: 'Founder proposal edited',
  FounderProposalDismissed: 'Founder proposal dismissed',
  RealityEvidenceReceived: 'Reality evidence received',
  RealityBeliefUpdated: 'Reality belief updated',
  RealityContradictionDetected: 'Reality contradiction detected',
  RealityHypothesisCreated: 'Reality hypothesis created',
  RealityUnknownCreated: 'Reality unknown created',
  RealityModelReconciled: 'Reality model reconciled',
  RealityCompacted: 'Reality model compacted',
  FounderEvaluationStarted: 'Founder evaluation started',
  FounderEvaluationScenarioCompleted: 'Evaluation scenario completed',
  FounderEvaluationCompleted: 'Founder evaluation completed',
  FounderEvaluationCriticalFailure: 'Evaluation critical failure',
  ActionProposed: 'Action proposed',
  ActionApproved: 'Action approved',
  ActionRejected: 'Action rejected',
  ActionExecuted: 'Action executed',
  ActionFailed: 'Action failed',
}

export function summarizeEventPayload(type: FounderEventType, payload: Record<string, unknown>): string {
  switch (type) {
    case 'CaptureCreated':
      return String(payload.captureId ?? payload.signalId ?? 'capture')
    case 'DecisionGenerated':
      return String(payload.decisionTitle ?? payload.decisionId ?? 'decision')
    case 'EveningCompleted':
      return String(payload.date ?? payload.reviewId ?? 'evening')
    case 'MemoryCreated':
      return String(payload.title ?? payload.memoryId ?? 'memory')
    case 'OutcomeRecorded':
      return String(payload.predictionId ?? 'outcome')
    case 'ConversationStarted':
      return String(payload.sessionId ?? payload.topic ?? 'conversation')
    case 'ConversationAnswered': {
      const answer = typeof payload.answer === 'string' ? payload.answer.slice(0, 40) : 'answer'
      return String(payload.questionId ?? answer)
    }
    case 'ConversationMemoryCreated':
      return String(payload.title ?? payload.memoryId ?? 'memory')
    case 'ConversationKnowledgeSuggested': {
      const suggestion = typeof payload.suggestion === 'string' ? payload.suggestion.slice(0, 40) : 'knowledge'
      return suggestion
    }
    case 'CognitiveModelUpdated':
      return String(payload.beliefCount ?? 'beliefs updated')
    case 'FounderAIResponded':
      return String(payload.mode ?? 'response')
    case 'FounderProposalApproved':
      return String(payload.actionType ?? payload.proposalId ?? 'approved')
    case 'FounderProposalDismissed':
      return String(payload.proposalId ?? 'dismissed')
    case 'ActionProposed':
    case 'ActionApproved':
    case 'ActionExecuted':
    case 'ActionFailed':
      return String(payload.actionType ?? payload.actionId ?? type)
    case 'ActionRejected':
      return String(payload.reason ?? payload.actionType ?? 'rejected')
    default:
      return Object.keys(payload).slice(0, 3).join(', ') || type
  }
}
