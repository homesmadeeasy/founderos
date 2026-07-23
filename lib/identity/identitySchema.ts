import type {
  IdentityDatastore,
  IdentityEvidence,
  IdentityFact,
  IdentityHistoryEntry,
} from './identityTypes'
import { IDENTITY_STORAGE_VERSION } from './identityTypes'

export function emptyIdentityDatastore(now = new Date().toISOString()): IdentityDatastore {
  return {
    version: IDENTITY_STORAGE_VERSION,
    facts: [],
    evidence: [],
    history: [],
    enabledSpecialists: [],
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function sanitizeIdentityDatastore(raw: unknown): IdentityDatastore {
  const base = emptyIdentityDatastore()
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Partial<IdentityDatastore>
  return {
    version: IDENTITY_STORAGE_VERSION,
    facts: Array.isArray(data.facts) ? data.facts.filter(isFactShape) : [],
    evidence: Array.isArray(data.evidence) ? data.evidence.filter(isEvidenceShape) : [],
    history: Array.isArray(data.history) ? data.history.filter(isHistoryShape) : [],
    enabledSpecialists: Array.isArray(data.enabledSpecialists)
      ? data.enabledSpecialists.filter(s => typeof s === 'string')
      : [],
    onboardingComplete: Boolean(data.onboardingComplete),
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : base.createdAt,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : base.updatedAt,
  }
}

export function migrateIdentityDatastore(raw: unknown): IdentityDatastore {
  if (!raw || typeof raw !== 'object') return emptyIdentityDatastore()
  const data = raw as Partial<IdentityDatastore>
  const version = data.version ?? 0
  if (version < 1) {
    return sanitizeIdentityDatastore({ ...data, version: 1 })
  }
  return sanitizeIdentityDatastore(data)
}

function isFactShape(value: unknown): value is IdentityFact {
  if (!value || typeof value !== 'object') return false
  const f = value as IdentityFact
  return typeof f.id === 'string' && typeof f.key === 'string' && typeof f.kind === 'string'
}

function isEvidenceShape(value: unknown): value is IdentityEvidence {
  if (!value || typeof value !== 'object') return false
  const e = value as IdentityEvidence
  return typeof e.id === 'string' && typeof e.summary === 'string'
}

function isHistoryShape(value: unknown): value is IdentityHistoryEntry {
  if (!value || typeof value !== 'object') return false
  const h = value as IdentityHistoryEntry
  return typeof h.id === 'string' && typeof h.factId === 'string'
}
