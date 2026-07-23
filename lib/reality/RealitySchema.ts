import type {
  RealityAggregation,
  RealityDatastore,
  RealityEvidence,
  RealityEvent,
  RealitySnapshotRecord,
} from './RealityTypes'
import { REALITY_STORAGE_VERSION } from './RealityTypes'

export function emptyRealityDatastore(now = new Date().toISOString()): RealityDatastore {
  return {
    version: REALITY_STORAGE_VERSION,
    events: [],
    evidence: [],
    aggregations: [],
    snapshots: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function sanitizeRealityDatastore(raw: unknown): RealityDatastore {
  const base = emptyRealityDatastore()
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Partial<RealityDatastore>
  return {
    version: REALITY_STORAGE_VERSION,
    events: Array.isArray(data.events) ? data.events.filter(isEventShape) : [],
    evidence: Array.isArray(data.evidence) ? data.evidence.filter(isEvidenceShape) : [],
    aggregations: Array.isArray(data.aggregations) ? data.aggregations.filter(isAggregationShape) : [],
    snapshots: Array.isArray(data.snapshots) ? data.snapshots.filter(isSnapshotRecordShape) : [],
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : base.createdAt,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : base.updatedAt,
  }
}

export function migrateRealityDatastore(raw: unknown): RealityDatastore {
  if (!raw || typeof raw !== 'object') return emptyRealityDatastore()
  const data = raw as Partial<RealityDatastore>
  const version = data.version ?? 0
  if (version < 1) {
    return sanitizeRealityDatastore({ ...data, version: 1 })
  }
  return sanitizeRealityDatastore(data)
}

function isEventShape(value: unknown): value is RealityEvent {
  if (!value || typeof value !== 'object') return false
  const e = value as RealityEvent
  return typeof e.id === 'string'
    && typeof e.timestamp === 'string'
    && typeof e.eventType === 'string'
    && typeof e.title === 'string'
}

function isEvidenceShape(value: unknown): value is RealityEvidence {
  if (!value || typeof value !== 'object') return false
  const e = value as RealityEvidence
  return typeof e.id === 'string' && typeof e.summary === 'string'
}

function isAggregationShape(value: unknown): value is RealityAggregation {
  if (!value || typeof value !== 'object') return false
  const a = value as RealityAggregation
  return typeof a.id === 'string' && Array.isArray(a.eventIds)
}

function isSnapshotRecordShape(value: unknown): value is RealitySnapshotRecord {
  if (!value || typeof value !== 'object') return false
  const s = value as RealitySnapshotRecord
  return typeof s.id === 'string' && !!s.snapshot && typeof s.createdAt === 'string'
}
