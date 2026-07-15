import type {
  Belief,
  BeliefContradiction,
  BeliefEvidence,
  BeliefHistoryEntry,
  BeliefImportance,
  BeliefSource,
  BeliefStatus,
  BeliefTopic,
  CognitiveDimension,
  CognitiveQuestion,
  CognitiveStore,
  Hypothesis,
  Unknown,
  WorldModel,
} from './beliefTypes'
import {
  asArray,
  asBoolean,
  asNumber,
  asString,
  clampConfidence,
  safeId,
  safeTimestamp,
  uniqueById,
} from './cognitiveUtils'
import { createEmptyWorldModel } from './worldModel'

const BELIEF_TOPICS: BeliefTopic[] = [
  'vision', 'mission', 'founder', 'validation', 'execution', 'product',
  'health', 'learning', 'relationships', 'finance', 'strategy', 'general',
]

const BELIEF_STATUSES: BeliefStatus[] = [
  'confirmed', 'likely', 'possible', 'unknown', 'contradicted',
]

const BELIEF_IMPORTANCE: BeliefImportance[] = ['low', 'medium', 'high', 'critical']

function asBeliefTopic(value: unknown): BeliefTopic {
  const topic = asString(value, 'general')
  return BELIEF_TOPICS.includes(topic as BeliefTopic) ? topic as BeliefTopic : 'general'
}

function asBeliefStatus(value: unknown): BeliefStatus {
  const status = asString(value, 'unknown')
  return BELIEF_STATUSES.includes(status as BeliefStatus) ? status as BeliefStatus : 'unknown'
}

function asBeliefImportance(value: unknown): BeliefImportance {
  const importance = asString(value, 'medium')
  return BELIEF_IMPORTANCE.includes(importance as BeliefImportance)
    ? importance as BeliefImportance
    : 'medium'
}

function asBeliefSource(value: unknown): BeliefSource {
  const source = asString(value, 'system_inference')
  const allowed: BeliefSource[] = [
    'system_inference', 'conversation', 'memory', 'signal', 'outcome',
    'knowledge', 'decision', 'user_statement', 'hypothesis',
  ]
  return allowed.includes(source as BeliefSource) ? source as BeliefSource : 'system_inference'
}

export function normalizeBeliefEvidence(raw: unknown): BeliefEvidence | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const title = asString(item.title, 'Evidence')
  const summary = asString(item.summary, title)
  return {
    id: safeId(item.id, 'ev'),
    sourceType: asBeliefSource(item.sourceType),
    sourceId: asString(item.sourceId).trim() || undefined,
    title,
    summary,
    weight: clampConfidence(asNumber(item.weight, 50)) / 100,
    supports: asBoolean(item.supports),
    recordedAt: safeTimestamp(item.recordedAt),
  }
}

export function normalizeBeliefHistory(raw: unknown): BeliefHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  return {
    id: safeId(item.id, 'hist'),
    timestamp: safeTimestamp(item.timestamp),
    previousStatus: asBeliefStatus(item.previousStatus),
    newStatus: asBeliefStatus(item.newStatus),
    previousConfidence: clampConfidence(asNumber(item.previousConfidence, 0)),
    newConfidence: clampConfidence(asNumber(item.newConfidence, 0)),
    reason: asString(item.reason, 'Updated'),
    triggerEvent: asString(item.triggerEvent).trim() || undefined,
  }
}

export function normalizeBelief(raw: unknown): Belief | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const statement = asString(item.statement).trim()
  if (!statement) return null
  const now = safeTimestamp(item.updatedAt)
  return {
    id: safeId(item.id, 'belief'),
    topic: asBeliefTopic(item.topic),
    statement,
    confidence: clampConfidence(asNumber(item.confidence, 40)),
    status: asBeliefStatus(item.status),
    importance: asBeliefImportance(item.importance),
    source: asBeliefSource(item.source),
    createdAt: safeTimestamp(item.createdAt),
    updatedAt: now,
    lastReferenced: safeTimestamp(item.lastReferenced ?? item.updatedAt),
    supportingEvidence: asArray<unknown>(item.supportingEvidence)
      .map(normalizeBeliefEvidence)
      .filter((e): e is BeliefEvidence => e !== null),
    contradictingEvidence: asArray<unknown>(item.contradictingEvidence)
      .map(normalizeBeliefEvidence)
      .filter((e): e is BeliefEvidence => e !== null),
    history: asArray<unknown>(item.history)
      .map(normalizeBeliefHistory)
      .filter((h): h is BeliefHistoryEntry => h !== null),
    reality: item.reality && typeof item.reality === 'object'
      ? {
        entityId: asString((item.reality as Record<string, unknown>).entityId).trim() || undefined,
        predicate: asString((item.reality as Record<string, unknown>).predicate).trim() || undefined,
        normalizedValue: asString((item.reality as Record<string, unknown>).normalizedValue).trim() || undefined,
        sourceClassification: asString((item.reality as Record<string, unknown>).sourceClassification).trim() || undefined,
        staleAt: asString((item.reality as Record<string, unknown>).staleAt).trim() || undefined,
        supersededAt: asString((item.reality as Record<string, unknown>).supersededAt).trim() || undefined,
      }
      : undefined,
  }
}

export function normalizeHypothesis(raw: unknown): Hypothesis | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const statement = asString(item.statement).trim()
  if (!statement) return null
  const status = asString(item.status, 'open')
  const allowed = ['open', 'supported', 'rejected', 'inconclusive'] as const
  return {
    id: safeId(item.id, 'hyp'),
    statement,
    topic: asBeliefTopic(item.topic),
    confidence: clampConfidence(asNumber(item.confidence, 40)),
    status: allowed.includes(status as typeof allowed[number]) ? status as Hypothesis['status'] : 'open',
    evidenceFor: asArray<unknown>(item.evidenceFor).map((v) => asString(v)).filter(Boolean),
    evidenceAgainst: asArray<unknown>(item.evidenceAgainst).map((v) => asString(v)).filter(Boolean),
    createdAt: safeTimestamp(item.createdAt),
    updatedAt: safeTimestamp(item.updatedAt),
  }
}

export function normalizeUnknown(raw: unknown): Unknown | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const statement = asString(item.statement).trim()
  if (!statement) return null
  return {
    id: safeId(item.id, 'unk'),
    statement,
    topic: asBeliefTopic(item.topic),
    importance: asBeliefImportance(item.importance),
    relatedBeliefIds: asArray<unknown>(item.relatedBeliefIds).map((v) => asString(v)).filter(Boolean),
    createdAt: safeTimestamp(item.createdAt),
  }
}

export function normalizeCognitiveQuestion(raw: unknown): CognitiveQuestion | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const text = asString(item.text).trim()
  if (!text) return null
  return {
    id: safeId(item.id, 'q'),
    text,
    topic: asBeliefTopic(item.topic),
    targetBeliefId: asString(item.targetBeliefId).trim() || undefined,
    targetUnknownId: asString(item.targetUnknownId).trim() || undefined,
    targetHypothesisId: asString(item.targetHypothesisId).trim() || undefined,
    uncertaintyReduction: asNumber(item.uncertaintyReduction, 0.5),
    reason: asString(item.reason, 'Open question'),
  }
}

export function normalizeContradiction(raw: unknown): BeliefContradiction | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  return {
    id: safeId(item.id, 'contra'),
    beliefAId: asString(item.beliefAId, 'belief-a'),
    beliefBId: asString(item.beliefBId, 'belief-b'),
    description: asString(item.description, 'Conflicting beliefs'),
    detectedAt: safeTimestamp(item.detectedAt),
    resolved: asBoolean(item.resolved),
  }
}

function normalizeDimension(raw: unknown, label: string): CognitiveDimension {
  if (!raw || typeof raw !== 'object') {
    return { label, score: 50, confidence: 50, summary: 'Not yet assessed' }
  }
  const item = raw as Record<string, unknown>
  return {
    label: asString(item.label, label),
    score: clampConfidence(asNumber(item.score, 50)),
    confidence: clampConfidence(asNumber(item.confidence, 50)),
    summary: asString(item.summary, 'Not yet assessed'),
  }
}

export function normalizeWorldModel(raw: unknown): WorldModel {
  if (!raw || typeof raw !== 'object') return createEmptyWorldModel()
  const item = raw as Record<string, unknown>
  const empty = createEmptyWorldModel()
  const confidenceLevelsRaw = item.confidenceLevels
  const confidenceLevels: Record<string, number> = {}
  if (confidenceLevelsRaw && typeof confidenceLevelsRaw === 'object') {
    for (const [key, value] of Object.entries(confidenceLevelsRaw as Record<string, unknown>)) {
      confidenceLevels[key] = clampConfidence(asNumber(value, 40))
    }
  }

  return {
    vision: asString(item.vision),
    mission: asString(item.mission),
    values: asArray<unknown>(item.values).map((v) => asString(v)).filter(Boolean),
    currentStage: asString(item.currentStage, 'unknown'),
    momentum: normalizeDimension(item.momentum, 'Momentum'),
    execution: normalizeDimension(item.execution, 'Execution'),
    validation: normalizeDimension(item.validation, 'Validation'),
    health: normalizeDimension(item.health, 'Health'),
    learning: normalizeDimension(item.learning, 'Learning'),
    relationships: normalizeDimension(item.relationships, 'Relationships'),
    finance: normalizeDimension(item.finance, 'Finance'),
    unknowns: uniqueById(
      asArray<unknown>(item.unknowns)
        .map(normalizeUnknown)
        .filter((u): u is Unknown => u !== null),
    ),
    openQuestions: uniqueById(
      asArray<unknown>(item.openQuestions)
        .map(normalizeCognitiveQuestion)
        .filter((q): q is CognitiveQuestion => q !== null),
    ),
    currentRisks: asArray<unknown>(item.currentRisks).map((v) => asString(v)).filter(Boolean),
    currentHypotheses: uniqueById(
      asArray<unknown>(item.currentHypotheses)
        .map(normalizeHypothesis)
        .filter((h): h is Hypothesis => h !== null),
    ),
    currentBottlenecks: asArray<unknown>(item.currentBottlenecks).map((v) => asString(v)).filter(Boolean),
    confidenceLevels: Object.keys(confidenceLevels).length ? confidenceLevels : empty.confidenceLevels,
    beliefs: uniqueById(
      asArray<unknown>(item.beliefs)
        .map(normalizeBelief)
        .filter((b): b is Belief => b !== null),
    ),
    contradictions: uniqueById(
      asArray<unknown>(item.contradictions)
        .map(normalizeContradiction)
        .filter((c): c is BeliefContradiction => c !== null),
    ),
    updatedAt: safeTimestamp(item.updatedAt),
    realitySnapshot: item.realitySnapshot && typeof item.realitySnapshot === 'object'
      ? item.realitySnapshot as WorldModel['realitySnapshot']
      : undefined,
  }
}

export function normalizeCognitiveStore(raw: unknown): CognitiveStore {
  if (!raw || typeof raw !== 'object') {
    return {
      worldModel: createEmptyWorldModel(),
      timeline: [],
      lastKernelSyncAt: null,
    }
  }
  const item = raw as Record<string, unknown>
  return {
    worldModel: normalizeWorldModel(item.worldModel),
    timeline: asArray<unknown>(item.timeline)
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => {
        const e = entry as Record<string, unknown>
        return {
          id: safeId(e.id, 'tl'),
          type: asString(e.type, 'kernel') as CognitiveStore['timeline'][number]['type'],
          title: asString(e.title, 'Update'),
          detail: asString(e.detail, ''),
          timestamp: safeTimestamp(e.timestamp),
          relatedIds: asArray<unknown>(e.relatedIds).map((v) => asString(v)).filter(Boolean),
        }
      }),
    lastKernelSyncAt: asString(item.lastKernelSyncAt).trim() || null,
    realityMeta: item.realityMeta && typeof item.realityMeta === 'object'
      ? item.realityMeta as CognitiveStore['realityMeta']
      : undefined,
  }
}
