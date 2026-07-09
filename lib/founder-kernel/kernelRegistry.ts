import { FOUNDER_EVENT_TYPES } from './kernelEvents'
import type { FounderEventType } from './kernelTypes'

export interface SubscriberCatalogEntry {
  id: string
  name: string
  priority: number
  subscribedEvents: FounderEventType[]
}

const ALL_EVENTS = FOUNDER_EVENT_TYPES as FounderEventType[]

export const KERNEL_SUBSCRIBER_CATALOG: SubscriberCatalogEntry[] = [
  {
    id: 'signal-engine',
    name: 'Signal Engine',
    priority: 10,
    subscribedEvents: ['CaptureCreated', 'SignalCreated', 'CalendarSynced'],
  },
  {
    id: 'object-engine',
    name: 'Object Engine',
    priority: 20,
    subscribedEvents: ['CaptureCreated', 'ObjectCreated', 'ObjectUpdated', 'ObjectCompleted'],
  },
  {
    id: 'memory-engine',
    name: 'Memory Engine',
    priority: 30,
    subscribedEvents: ['CaptureCreated', 'MemoryCreated', 'SignalProcessed', 'EveningCompleted'],
  },
  {
    id: 'knowledge-engine',
    name: 'Knowledge Engine',
    priority: 40,
    subscribedEvents: ['MemoryCreated', 'OutcomeRecorded', 'EveningCompleted'],
  },
  {
    id: 'outcome-engine',
    name: 'Outcome Engine',
    priority: 50,
    subscribedEvents: ['DecisionGenerated', 'EveningCompleted', 'OutcomeRecorded'],
  },
  {
    id: 'domain-intelligence',
    name: 'Domain Intelligence',
    priority: 55,
    subscribedEvents: ['MorningStarted', 'SignalProcessed', 'OutcomeRecorded', 'CaptureCreated'],
  },
  {
    id: 'decision-engine',
    name: 'Decision Engine',
    priority: 60,
    subscribedEvents: ['ObjectUpdated', 'SignalProcessed', 'OutcomeRecorded', 'MorningStarted', 'CaptureCreated'],
  },
  {
    id: 'morning-execution',
    name: 'Morning Execution',
    priority: 70,
    subscribedEvents: ['DecisionGenerated', 'EveningCompleted', 'MorningStarted', 'CaptureCreated'],
  },
  {
    id: 'evening-review',
    name: 'Evening Review',
    priority: 80,
    subscribedEvents: ['EveningCompleted', 'OutcomeRecorded'],
  },
  {
    id: 'assistant',
    name: 'Assistant',
    priority: 90,
    subscribedEvents: [
      'CaptureCreated', 'DecisionGenerated', 'EveningCompleted', 'OutcomeRecorded',
      'UserAskedQuestion', 'MorningStarted',
    ],
  },
  {
    id: 'ui-refresh',
    name: 'UI Refresh',
    priority: 100,
    subscribedEvents: ALL_EVENTS,
  },
]

export function getCatalogEntry(id: string): SubscriberCatalogEntry | undefined {
  return KERNEL_SUBSCRIBER_CATALOG.find(entry => entry.id === id)
}
