/**
 * Domain-agnostic adapters that translate specialist / product signals into Reality events.
 * Never import Gym/Founder domain types here — keep payloads generic.
 */

import type { RecordRealityEventInput, RealityDomain, RealitySourceKind } from './RealityTypes'

export interface AdapterSignal {
  id?: string
  domain: RealityDomain
  eventType: string
  title: string
  summary?: string
  timestamp?: string
  entityType?: string
  entityId?: string
  entityLabel?: string
  importance?: number
  confidence?: number
  kind?: 'declared' | 'inferred'
  sourceKind?: RealitySourceKind
  sourceLabel?: string
  metadata?: Record<string, unknown>
  specialistTags?: string[]
  evidenceSummary?: string
}

const DOMAIN_SOURCE: Partial<Record<RealityDomain, RealitySourceKind>> = {
  gym: 'gym',
  founder: 'founder',
  tasks: 'tasks',
  notes: 'notes',
  journal: 'journal',
  calendar: 'calendar',
  identity: 'identity',
  memory: 'memory',
  system: 'system',
  integration: 'integration',
}

export function adapterSignalToRealityInput(signal: AdapterSignal): RecordRealityEventInput {
  const sourceKind = signal.sourceKind
    ?? DOMAIN_SOURCE[signal.domain]
    ?? 'system'
  return {
    timestamp: signal.timestamp,
    domain: signal.domain,
    entity: signal.entityType
      ? { type: signal.entityType, id: signal.entityId, label: signal.entityLabel }
      : undefined,
    eventType: signal.eventType,
    title: signal.title,
    summary: signal.summary,
    metadata: signal.metadata ?? {},
    importance: signal.importance,
    confidence: signal.confidence,
    kind: signal.kind ?? 'declared',
    source: {
      kind: sourceKind,
      label: signal.sourceLabel ?? signal.domain,
      externalId: signal.id,
    },
    specialistTags: signal.specialistTags ?? [signal.domain],
    idempotencyKey: signal.id ? `adapter:${signal.domain}:${signal.id}` : undefined,
    evidenceSummaries: signal.evidenceSummary ? [signal.evidenceSummary] : undefined,
  }
}

/** Placeholder calendar adapter — future Google Calendar sync fills these. */
export function calendarPlaceholderSignals(now = new Date().toISOString()): AdapterSignal[] {
  return [{
    id: `cal-placeholder-${now.slice(0, 10)}`,
    domain: 'calendar',
    eventType: 'calendar_event',
    title: 'Calendar sync placeholder',
    summary: 'Calendar integration not connected yet.',
    timestamp: now,
    importance: 0.2,
    kind: 'inferred',
    confidence: 0.3,
    sourceKind: 'calendar',
    sourceLabel: 'Calendar placeholder',
    metadata: { placeholder: true },
  }]
}

export function gymWorkoutAdapter(input: {
  id: string
  title: string
  status: 'started' | 'completed' | 'logged'
  at?: string
  summary?: string
}): AdapterSignal {
  const eventType =
    input.status === 'started' ? 'workout_started'
      : input.status === 'completed' ? 'workout_completed'
        : 'workout_logged'
  return {
    id: input.id,
    domain: 'gym',
    eventType,
    title: input.title,
    summary: input.summary,
    timestamp: input.at,
    entityType: 'workout',
    entityId: input.id,
    entityLabel: input.title,
    importance: input.status === 'completed' ? 0.85 : 0.55,
    sourceKind: 'gym',
    sourceLabel: 'Gym',
    evidenceSummary: `Gym workout ${input.status}`,
  }
}

export function founderTaskAdapter(input: {
  id: string
  title: string
  status: 'created' | 'finished' | 'blocked'
  at?: string
  projectLabel?: string
}): AdapterSignal {
  const eventType =
    input.status === 'finished' ? 'task_finished'
      : input.status === 'blocked' ? 'task_blocked'
        : 'task_created'
  return {
    id: input.id,
    domain: 'tasks',
    eventType,
    title: input.title,
    timestamp: input.at,
    entityType: 'task',
    entityId: input.id,
    entityLabel: input.projectLabel ?? input.title,
    importance: input.status === 'finished' ? 0.8 : input.status === 'blocked' ? 0.75 : 0.5,
    sourceKind: 'tasks',
    sourceLabel: 'Tasks',
    metadata: input.status === 'blocked' ? { blocked: true } : undefined,
    specialistTags: ['founder', 'tasks'],
  }
}

export function journalNoteAdapter(input: {
  id: string
  title: string
  kind: 'journal' | 'note'
  at?: string
  excerpt?: string
}): AdapterSignal {
  return {
    id: input.id,
    domain: input.kind === 'journal' ? 'journal' : 'notes',
    eventType: input.kind === 'journal' ? 'journal_entry' : 'note_created',
    title: input.title,
    summary: input.excerpt,
    timestamp: input.at,
    importance: 0.45,
    sourceKind: input.kind === 'journal' ? 'journal' : 'notes',
    sourceLabel: input.kind === 'journal' ? 'Journal' : 'Notes',
  }
}

export function identityMemoryAdapter(input: {
  id: string
  source: 'identity' | 'memory'
  title: string
  at?: string
}): AdapterSignal {
  return {
    id: input.id,
    domain: input.source,
    eventType: input.source === 'identity' ? 'identity_updated' : 'memory_created',
    title: input.title,
    timestamp: input.at,
    importance: 0.4,
    sourceKind: input.source,
    sourceLabel: input.source === 'identity' ? 'Identity' : 'Memory',
  }
}
