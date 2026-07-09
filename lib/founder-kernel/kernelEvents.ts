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
    default:
      return Object.keys(payload).slice(0, 3).join(', ') || type
  }
}
