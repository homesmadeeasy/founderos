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
    default:
      return Object.keys(payload).slice(0, 3).join(', ') || type
  }
}
