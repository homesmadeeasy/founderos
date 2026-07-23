/**
 * FounderOS Reality Engine — shared live operating-state types.
 * Answers “what is happening now?” for every specialist.
 * Distinct from cognitive-model belief Reality (conversation reconciliation).
 */

export const REALITY_STORAGE_KEY = 'founderos-reality-v1'
export const REALITY_PENDING_KEY = 'founderos-reality-pending-v1'
export const REALITY_STORAGE_VERSION = 1

/** Free-form specialist ids so new domains opt in without schema forks. */
export type SpecialistId = string

export type RealityDomain =
  | 'gym'
  | 'founder'
  | 'school'
  | 'finance'
  | 'health'
  | 'travel'
  | 'tasks'
  | 'notes'
  | 'journal'
  | 'calendar'
  | 'identity'
  | 'memory'
  | 'system'
  | 'integration'
  | 'custom'

export type RealityEventKind = 'declared' | 'inferred'

export type RealityEventStatus =
  | 'active'
  | 'superseded'
  | 'dismissed'
  | 'aggregated'

export type RealitySourceKind =
  | 'user_input'
  | 'gym'
  | 'founder'
  | 'tasks'
  | 'notes'
  | 'journal'
  | 'calendar'
  | 'identity'
  | 'memory'
  | 'kernel'
  | 'system'
  | 'integration'
  | 'inferred'

export interface RealitySource {
  kind: RealitySourceKind
  label: string
  detail?: string
  externalId?: string
}

export interface RealityEntityRef {
  type: string
  id?: string
  label?: string
}

export interface RealityEvidence {
  id: string
  eventId?: string
  source: RealitySource
  summary: string
  detail?: string
  observedAt: string
  /** Relative weight 0–1 for confidence aggregation. */
  weight: number
  metadata?: Record<string, unknown>
  createdAt: string
}

/**
 * Canonical life event. Extensible eventType strings (workout_completed, task_finished, …).
 */
export interface RealityEvent {
  id: string
  timestamp: string
  domain: RealityDomain
  entity?: RealityEntityRef
  eventType: string
  title: string
  summary?: string
  metadata: Record<string, unknown>
  importance: number
  confidence: number
  evidenceIds: string[]
  source: RealitySource
  status: RealityEventStatus
  kind: RealityEventKind
  aggregationId?: string
  specialistTags: SpecialistId[]
  /** Stable key for idempotent ingest from kernel / adapters. */
  idempotencyKey?: string
  createdAt: string
  updatedAt: string
}

export interface RealityAggregation {
  id: string
  domain: RealityDomain
  title: string
  summary: string
  eventIds: string[]
  eventType: string
  startAt: string
  endAt: string
  importance: number
  confidence: number
  specialistTags: SpecialistId[]
  createdAt: string
  updatedAt: string
}

export interface RealityFocusItem {
  id: string
  label: string
  domain: RealityDomain
  reason: string
  importance: number
  eventId?: string
}

export interface RealityRiskItem {
  id: string
  label: string
  domain: RealityDomain
  severity: number
  reason: string
  eventId?: string
}

export interface RealityActionItem {
  id: string
  label: string
  domain: RealityDomain
  dueHint?: string
  eventId?: string
}

export interface RealityWinItem {
  id: string
  label: string
  domain: RealityDomain
  at: string
  eventId?: string
}

/** Derived operating snapshot — what specialists should read. */
export interface RealitySnapshot {
  generatedAt: string
  windowStart: string
  windowEnd: string
  energy?: { label: string; confidence: number; note?: string }
  recovery?: { label: string; confidence: number; note?: string }
  currentProjects: RealityFocusItem[]
  todaysWorkout?: RealityFocusItem
  upcomingDeadlines: RealityActionItem[]
  recentWins: RealityWinItem[]
  risks: RealityRiskItem[]
  habits: string[]
  momentum: {
    score: number
    label: string
    confidence: number
    note: string
  }
  outstandingTasks: RealityActionItem[]
  blockedItems: RealityActionItem[]
  recentDecisions: RealityWinItem[]
  narrativeHints: string[]
  eventCountToday: number
  eventCountWeek: number
}

export interface RealitySnapshotRecord {
  id: string
  snapshot: RealitySnapshot
  createdAt: string
}

export interface RealityDatastore {
  version: number
  events: RealityEvent[]
  evidence: RealityEvidence[]
  aggregations: RealityAggregation[]
  snapshots: RealitySnapshotRecord[]
  createdAt: string
  updatedAt: string
}

export interface RealityTimelineDay {
  date: string
  label: string
  items: RealityTimelineItem[]
}

export interface RealityTimelineItem {
  id: string
  kind: 'event' | 'aggregation'
  timestamp: string
  domain: RealityDomain
  title: string
  summary?: string
  importance: number
  confidence: number
  eventType: string
  specialistTags: SpecialistId[]
  status: RealityEventStatus | 'aggregated_summary'
  /** True when confidence < 1 and kind is inferred — UI must not present as hard fact. */
  isAssumption: boolean
}

export interface RecordRealityEventInput {
  timestamp?: string
  domain: RealityDomain
  entity?: RealityEntityRef
  eventType: string
  title: string
  summary?: string
  metadata?: Record<string, unknown>
  importance?: number
  confidence?: number
  kind?: RealityEventKind
  source: RealitySource
  specialistTags?: SpecialistId[]
  idempotencyKey?: string
  evidenceSummaries?: string[]
}

export interface RealitySpecialistView {
  snapshot: RealitySnapshot
  today: RealityTimelineDay | null
  recent: RealityTimelineItem[]
  focus: RealityFocusItem[]
  momentum: RealitySnapshot['momentum']
  updatedAt: string
}

export const REALITY_DOMAIN_LABELS: Record<RealityDomain, string> = {
  gym: 'Gym',
  founder: 'Founder',
  school: 'School',
  finance: 'Finance',
  health: 'Health',
  travel: 'Travel',
  tasks: 'Tasks',
  notes: 'Notes',
  journal: 'Journal',
  calendar: 'Calendar',
  identity: 'Identity',
  memory: 'Memory',
  system: 'System',
  integration: 'Integration',
  custom: 'Custom',
}
