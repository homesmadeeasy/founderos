/**
 * Reality event type vocabulary + kernel mapping.
 * Keep extensible — specialists may introduce new eventType strings.
 */

import type { FounderEventType } from '@/lib/founder-kernel/kernelTypes'
import type { RealityDomain, RealitySourceKind } from './RealityTypes'

export const REALITY_EVENT_TYPES = [
  'workout_completed',
  'workout_started',
  'workout_logged',
  'task_finished',
  'task_created',
  'task_blocked',
  'project_created',
  'project_updated',
  'bodyweight_updated',
  'sleep_logged',
  'study_session',
  'expense_added',
  'goal_achieved',
  'goal_changed',
  'journal_entry',
  'calendar_event',
  'conversation',
  'decision_accepted',
  'memory_created',
  'identity_updated',
  'note_created',
  'capture_processed',
  'github_commit',
  'stripe_payment',
  'email_received',
  'location_update',
  'wearable_sample',
  'custom',
] as const

export type KnownRealityEventType = (typeof REALITY_EVENT_TYPES)[number]

export interface KernelToRealityMapping {
  kernelType: FounderEventType
  eventType: string
  domain: RealityDomain
  sourceKind: RealitySourceKind
  titleFromPayload: (payload: Record<string, unknown>) => string
  importance: number
}

function str(payload: Record<string, unknown>, key: string, fallback: string): string {
  const v = payload[key]
  return typeof v === 'string' && v.trim() ? v : fallback
}

/** Known kernel → reality adapters (domain-agnostic titles from payload). */
export const KERNEL_REALITY_MAPPINGS: KernelToRealityMapping[] = [
  {
    kernelType: 'WorkoutCompleted',
    eventType: 'workout_completed',
    domain: 'gym',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', str(p, 'routineName', 'Workout completed')),
    importance: 0.85,
  },
  {
    kernelType: 'WorkoutStarted',
    eventType: 'workout_started',
    domain: 'gym',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Workout started'),
    importance: 0.55,
  },
  {
    kernelType: 'WorkoutLogged',
    eventType: 'workout_logged',
    domain: 'gym',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Workout logged'),
    importance: 0.7,
  },
  {
    kernelType: 'MemoryCreated',
    eventType: 'memory_created',
    domain: 'memory',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Memory created'),
    importance: 0.6,
  },
  {
    kernelType: 'ObjectCreated',
    eventType: 'project_created',
    domain: 'founder',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', str(p, 'name', 'Object created')),
    importance: 0.65,
  },
  {
    kernelType: 'ObjectUpdated',
    eventType: 'project_updated',
    domain: 'founder',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Object updated'),
    importance: 0.45,
  },
  {
    kernelType: 'ObjectCompleted',
    eventType: 'task_finished',
    domain: 'tasks',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Object completed'),
    importance: 0.8,
  },
  {
    kernelType: 'DecisionAccepted',
    eventType: 'decision_accepted',
    domain: 'founder',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Decision accepted'),
    importance: 0.75,
  },
  {
    kernelType: 'OutcomeRecorded',
    eventType: 'goal_achieved',
    domain: 'founder',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Outcome recorded'),
    importance: 0.7,
  },
  {
    kernelType: 'IdentityUpdated',
    eventType: 'identity_updated',
    domain: 'identity',
    sourceKind: 'kernel',
    titleFromPayload: () => 'Identity updated',
    importance: 0.4,
  },
  {
    kernelType: 'GoalChanged',
    eventType: 'goal_changed',
    domain: 'founder',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Goal changed'),
    importance: 0.7,
  },
  {
    kernelType: 'StudyCompleted',
    eventType: 'study_session',
    domain: 'school',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Study session completed'),
    importance: 0.75,
  },
  {
    kernelType: 'CaptureProcessed',
    eventType: 'capture_processed',
    domain: 'system',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Capture processed'),
    importance: 0.35,
  },
  {
    kernelType: 'SignalCreated',
    eventType: 'custom',
    domain: 'system',
    sourceKind: 'kernel',
    titleFromPayload: p => str(p, 'title', 'Signal created'),
    importance: 0.4,
  },
]

export function mappingForKernelType(type: FounderEventType): KernelToRealityMapping | undefined {
  return KERNEL_REALITY_MAPPINGS.find(m => m.kernelType === type)
}

export const REALITY_KERNEL_EVENT_TYPES = KERNEL_REALITY_MAPPINGS.map(m => m.kernelType)

/** Families used by aggregator to collapse noisy repeats. */
export function aggregationFamily(eventType: string): string {
  if (eventType.startsWith('workout_')) return 'workout'
  if (eventType.startsWith('task_')) return 'task'
  if (eventType.startsWith('project_')) return 'project'
  if (eventType.startsWith('goal_')) return 'goal'
  return eventType
}
