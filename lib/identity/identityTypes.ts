/**
 * FounderOS Identity Engine — shared domain types.
 * Extensible foundation for every specialist. No specialist-specific hardcoding.
 */

export const IDENTITY_STORAGE_KEY = 'founderos-identity-v1'
export const IDENTITY_PENDING_KEY = 'founderos-identity-pending-v1'
export const IDENTITY_STORAGE_VERSION = 1

export type IdentityCategory =
  | 'personal'
  | 'goals'
  | 'preferences'
  | 'capabilities'
  | 'experience'
  | 'lifestyle'
  | 'health'
  | 'work'
  | 'education'
  | 'finance'
  | 'relationships'
  | 'travel'
  | 'technology'
  | 'custom'

export type IdentityFactKind = 'declared' | 'observed'

export type IdentityFactStatus =
  | 'active'
  | 'rejected'
  | 'dismissed'
  | 'superseded'

export type IdentitySourceKind =
  | 'user_input'
  | 'workout_history'
  | 'calendar'
  | 'tasks'
  | 'notes'
  | 'journal'
  | 'system'
  | 'integration'
  | 'manual_override'
  | 'onboarding'

export type IdentityHistoryChangeType =
  | 'created'
  | 'updated'
  | 'confirmed'
  | 'rejected'
  | 'dismissed'
  | 'confidence_changed'
  | 'superseded'
  | 'corrected'

/** Specialist ids are free-form strings so new domains can opt in without schema forks. */
export type SpecialistId = string

export type IdentityValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>
  | null

export interface IdentitySource {
  kind: IdentitySourceKind
  label: string
  detail?: string
  externalId?: string
}

export interface IdentityEvidence {
  id: string
  /** Optional link; evidence may exist before fact assignment. */
  factId?: string
  source: IdentitySource
  summary: string
  detail?: string
  observedAt: string
  /** Relative weight 0–1 for confidence aggregation. */
  weight: number
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface IdentityFact {
  id: string
  category: IdentityCategory
  /** Stable machine key, e.g. primary_goal, preferred_time_of_day */
  key: string
  label: string
  value: IdentityValue
  displayValue: string
  kind: IdentityFactKind
  confidence: number
  source: IdentitySource
  evidenceIds: string[]
  status: IdentityFactStatus
  /** Optional tags for specialist relevance without hardcoding domain logic. */
  relevanceTags: string[]
  createdAt: string
  updatedAt: string
  lastObservedAt?: string
  /** When observed conflicts with a declared fact of the same key. */
  contradictsFactId?: string
  contradictionNote?: string
}

export interface IdentityHistoryEntry {
  id: string
  factId: string
  changeType: IdentityHistoryChangeType
  previousSnapshot?: Partial<IdentityFact> | null
  nextSnapshot?: Partial<IdentityFact> | null
  reason?: string
  at: string
  actor: 'user' | 'system' | 'inference'
}

/**
 * Domain-agnostic observation signal.
 * Specialists emit signals; IdentityEngine infers facts. Identity never imports Gym/Founder types.
 */
export interface ObservationSignal {
  id?: string
  /** Logical domain bucket, e.g. training, calendar, tasks — not a specialist package name required. */
  domain: string
  signalType: string
  occurredAt: string
  payload: Record<string, unknown>
}

export interface IdentityDatastore {
  version: number
  facts: IdentityFact[]
  evidence: IdentityEvidence[]
  history: IdentityHistoryEntry[]
  enabledSpecialists: SpecialistId[]
  onboardingComplete: boolean
  createdAt: string
  updatedAt: string
}

export interface DeclareFactInput {
  category: IdentityCategory
  key: string
  label: string
  value: IdentityValue
  displayValue?: string
  source?: IdentitySource
  relevanceTags?: string[]
  evidenceSummaries?: string[]
}

export interface ReviewFactInput {
  factId: string
  action: 'confirm' | 'reject' | 'dismiss' | 'edit'
  editedValue?: IdentityValue
  editedDisplayValue?: string
  reason?: string
}

/** Read-only specialist view — never mutate through this shape. */
export interface IdentitySpecialistView {
  declared: IdentityFact[]
  observed: IdentityFact[]
  contradictions: IdentityFact[]
  byCategory: Partial<Record<IdentityCategory, IdentityFact[]>>
  byKey: Record<string, { declared?: IdentityFact; observed?: IdentityFact }>
  narrativeHints: string[]
  updatedAt: string
}

export const IDENTITY_CATEGORY_LABELS: Record<IdentityCategory, string> = {
  personal: 'Personal',
  goals: 'Goals',
  preferences: 'Preferences',
  capabilities: 'Capabilities',
  experience: 'Experience',
  lifestyle: 'Lifestyle',
  health: 'Health',
  work: 'Work',
  education: 'Education',
  finance: 'Finance',
  relationships: 'Relationships',
  travel: 'Travel',
  technology: 'Technology',
  custom: 'Custom',
}

export const DEFAULT_SPECIALIST_IDS = [
  'founder',
  'gym',
  'school',
  'finance',
  'health',
  'travel',
] as const
