import type { CreateSignalInput, SignalSource } from './signalTypes'
import { classifySignal } from './signalClassifier'
import { hoursAgo, newSignalId, nowISO, tomorrowAt } from './signalUtils'

export function buildMockSignals(): CreateSignalInput[] {
  const mocks: Array<Omit<CreateSignalInput, 'type' | 'confidence'> & { source: SignalSource }> = [
    {
      source: 'calendar',
      title: 'Economics study block',
      content: 'Economics study block scheduled tomorrow 2:00 PM – 4:00 PM.',
      timestamp: tomorrowAt(14),
      relatedObjectIds: [],
      metadata: { mock: true, calendarEvent: true, durationMinutes: 120 },
    },
    {
      source: 'health',
      title: '7.5 hours sleep',
      content: 'Sleep logged: 7.5 hours. Recovery baseline looks adequate.',
      timestamp: hoursAgo(10),
      relatedObjectIds: [],
      metadata: { mock: true, sleepHours: 7.5 },
    },
    {
      source: 'cursor',
      title: '2 hour FounderOS coding session',
      content: 'Cursor session: 2 hours on FounderOS — signal engine and capture integration.',
      timestamp: hoursAgo(5),
      relatedObjectIds: [],
      metadata: { mock: true, durationMinutes: 120, project: 'FounderOS' },
    },
    {
      source: 'health',
      title: 'Workout not logged today',
      content: 'No workout logged today. Training block may be overdue.',
      timestamp: hoursAgo(2),
      relatedObjectIds: [],
      metadata: { mock: true, workoutLogged: false, alert: true },
    },
    {
      source: 'email',
      title: 'Important school reminder',
      content: 'School reminder: assignment due next week — review economics notes.',
      timestamp: hoursAgo(8),
      relatedObjectIds: [],
      metadata: { mock: true, priority: 'high', domain: 'school' },
    },
    {
      source: 'manual_capture',
      title: 'FounderOS voice assistant idea',
      content: 'Captured idea: FounderOS should have a voice assistant for hands-free capture.',
      timestamp: hoursAgo(3),
      relatedObjectIds: [],
      metadata: { mock: true, captureOrigin: true },
    },
  ]

  return mocks.map(m => {
    const cls = classifySignal(m.source, m.title, m.content)
    return {
      ...m,
      type: cls.type,
      confidence: cls.confidence,
      metadata: { ...m.metadata, classificationReason: cls.reason },
    }
  })
}

export function buildSignalFromCapture(input: {
  captureId: string
  rawInput: string
  title: string
  content: string
  classification: string
  objectId?: string
  memoryId?: string
}): CreateSignalInput {
  const cls = classifySignal('manual_capture', input.title, input.content)
  return {
    id: newSignalId('cap-sig'),
    source: 'manual_capture',
    type: input.classification === 'workout' ? 'workout'
      : input.classification === 'idea' ? 'idea'
        : input.classification === 'meeting' ? 'event'
          : cls.type,
    title: input.title,
    content: input.content,
    timestamp: nowISO(),
    confidence: 'high',
    relatedObjectIds: [
      ...(input.objectId ? [input.objectId] : []),
      input.captureId,
    ],
    metadata: {
      captureId: input.captureId,
      captureClassification: input.classification,
      bridge: 'universal-capture',
    },
  }
}
