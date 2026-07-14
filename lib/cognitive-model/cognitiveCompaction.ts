import type {
  Belief,
  BeliefContradiction,
  BeliefEvidence,
  BeliefHistoryEntry,
  CognitiveStore,
  Hypothesis,
  Unknown,
  WorldModel,
} from './beliefTypes'
import { normalizeCognitiveStore } from './cognitiveNormalize'
import { asString, truncateText, uniqueById } from './cognitiveUtils'
import { COGNITIVE_RETENTION } from './cognitiveRetention'

export interface CognitiveStoreStats {
  beliefs: number
  evidence: number
  history: number
  timeline: number
  questions: number
  contradictions: number
  hypotheses: number
  unknowns: number
  sizeBytes: number
}

export interface CompactCognitiveStoreResult {
  store: CognitiveStore
  pruned: {
    evidence: number
    history: number
    timeline: number
    questions: number
    contradictions: number
    hypotheses: number
    unknowns: number
    beliefs: number
  }
}

export function evidenceStableKey(evidence: BeliefEvidence, beliefId?: string): string {
  const sourceId = asString(evidence.sourceId, evidence.title)
  const base = `${evidence.sourceType}:${sourceId}`
  return beliefId ? `${base}:${beliefId}` : base
}

export function compactEvidenceRef(evidence: BeliefEvidence): BeliefEvidence {
  return {
    id: asString(evidence.id),
    sourceType: evidence.sourceType,
    sourceId: asString(evidence.sourceId).trim() || undefined,
    title: truncateText(asString(evidence.title, 'Evidence'), 80),
    summary: truncateText(asString(evidence.summary, 'Evidence recorded'), COGNITIVE_RETENTION.MAX_EVIDENCE_SUMMARY_CHARS),
    weight: Math.max(0, Math.min(1, evidence.weight)),
    supports: evidence.supports,
    recordedAt: evidence.recordedAt,
  }
}

function capEvidenceList(items: BeliefEvidence[], max: number): BeliefEvidence[] {
  const merged = new Map<string, BeliefEvidence>()
  for (const item of items) {
    const compact = compactEvidenceRef(item)
    const key = evidenceStableKey(compact)
    const prev = merged.get(key)
    if (!prev || compact.recordedAt >= prev.recordedAt) merged.set(key, compact)
  }
  return Array.from(merged.values())
    .sort((a, b) => b.weight - a.weight || b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, max)
}

function capHistory(items: BeliefHistoryEntry[], max: number): BeliefHistoryEntry[] {
  const seen = new Set<string>()
  const deduped: BeliefHistoryEntry[] = []
  for (const item of [...items].reverse()) {
    const key = `${item.previousStatus}:${item.newStatus}:${item.previousConfidence}:${item.newConfidence}:${item.reason}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }
  return deduped.reverse().slice(-max)
}

function compactBelief(belief: Belief): Belief {
  return {
    ...belief,
    statement: truncateText(belief.statement, COGNITIVE_RETENTION.MAX_STATEMENT_CHARS),
    supportingEvidence: capEvidenceList(
      belief.supportingEvidence,
      COGNITIVE_RETENTION.MAX_EVIDENCE_PER_BELIEF,
    ),
    contradictingEvidence: capEvidenceList(
      belief.contradictingEvidence,
      COGNITIVE_RETENTION.MAX_EVIDENCE_PER_BELIEF,
    ),
    history: capHistory(belief.history, COGNITIVE_RETENTION.MAX_HISTORY_PER_BELIEF),
  }
}

function prioritizeContradictions(items: BeliefContradiction[]): BeliefContradiction[] {
  return [...items]
    .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.detectedAt.localeCompare(a.detectedAt))
    .slice(0, COGNITIVE_RETENTION.MAX_CONTRADICTIONS)
}

function prioritizeUnknowns(items: Unknown[]): Unknown[] {
  const order = { critical: 4, high: 3, medium: 2, low: 1 }
  return [...items]
    .sort((a, b) => order[b.importance] - order[a.importance] || b.createdAt.localeCompare(a.createdAt))
    .slice(0, COGNITIVE_RETENTION.MAX_UNKNOWNS)
}

function prioritizeHypotheses(items: Hypothesis[]): Hypothesis[] {
  return [...items]
    .sort((a, b) => {
      const openBoost = (x: Hypothesis) => (x.status === 'open' ? 2 : 0)
      return openBoost(b) - openBoost(a) || b.updatedAt.localeCompare(a.updatedAt)
    })
    .slice(0, COGNITIVE_RETENTION.MAX_HYPOTHESES)
}

function evidenceSemanticEqual(a: BeliefEvidence, b: BeliefEvidence): boolean {
  return (
    a.sourceType === b.sourceType
    && a.sourceId === b.sourceId
    && a.title === b.title
    && a.summary === b.summary
    && a.weight === b.weight
    && a.supports === b.supports
  )
}

export function mergeEvidenceLists(
  existing: BeliefEvidence[],
  incoming: BeliefEvidence[],
  beliefId?: string,
): BeliefEvidence[] {
  const merged = new Map<string, BeliefEvidence>()
  for (const item of [...existing, ...incoming]) {
    const compact = compactEvidenceRef(item)
    const key = evidenceStableKey(compact, beliefId)
    const prev = merged.get(key)
    if (!prev) {
      merged.set(key, compact)
      continue
    }
    if (evidenceSemanticEqual(prev, compact)) {
      merged.set(key, prev)
      continue
    }
    merged.set(key, compact.recordedAt >= prev.recordedAt ? compact : prev)
  }
  return Array.from(merged.values())
}

export function compactWorldModel(world: WorldModel, aggressive = false): WorldModel {
  const maxEvidence = aggressive
    ? Math.floor(COGNITIVE_RETENTION.MAX_EVIDENCE_PER_BELIEF / 2)
    : COGNITIVE_RETENTION.MAX_EVIDENCE_PER_BELIEF
  const maxHistory = aggressive
    ? Math.floor(COGNITIVE_RETENTION.MAX_HISTORY_PER_BELIEF / 2)
    : COGNITIVE_RETENTION.MAX_HISTORY_PER_BELIEF

  const beliefs = uniqueById(world.beliefs)
    .slice(0, COGNITIVE_RETENTION.MAX_BELIEFS)
    .map((belief) => ({
      ...compactBelief(belief),
      supportingEvidence: capEvidenceList(belief.supportingEvidence, maxEvidence),
      contradictingEvidence: capEvidenceList(belief.contradictingEvidence, maxEvidence),
      history: capHistory(belief.history, maxHistory),
      statement: truncateText(belief.statement, COGNITIVE_RETENTION.MAX_STATEMENT_CHARS),
    }))

  return {
    ...world,
    vision: truncateText(world.vision, 200),
    mission: truncateText(world.mission, 200),
    values: world.values.slice(0, 12).map((v) => truncateText(v, 80)),
    unknowns: prioritizeUnknowns(world.unknowns),
    openQuestions: world.openQuestions.slice(0, COGNITIVE_RETENTION.MAX_OPEN_QUESTIONS),
    currentRisks: world.currentRisks.slice(0, 8).map((r) => truncateText(r, 120)),
    currentHypotheses: prioritizeHypotheses(world.currentHypotheses),
    currentBottlenecks: world.currentBottlenecks.slice(0, 5),
    beliefs,
    contradictions: prioritizeContradictions(world.contradictions),
  }
}

export function compactCognitiveStore(store: CognitiveStore, aggressive = false): CompactCognitiveStoreResult {
  const normalized = normalizeCognitiveStore(store)
  const pruned = {
    evidence: 0,
    history: 0,
    timeline: 0,
    questions: 0,
    contradictions: 0,
    hypotheses: 0,
    unknowns: 0,
    beliefs: 0,
  }

  const beforeEvidence = normalized.worldModel.beliefs.reduce(
    (sum, b) => sum + b.supportingEvidence.length + b.contradictingEvidence.length, 0,
  )
  const beforeHistory = normalized.worldModel.beliefs.reduce((sum, b) => sum + b.history.length, 0)

  const worldModel = compactWorldModel(normalized.worldModel, aggressive)
  const maxTimeline = aggressive
    ? Math.floor(COGNITIVE_RETENTION.MAX_TIMELINE / 2)
    : COGNITIVE_RETENTION.MAX_TIMELINE
  const timeline = normalized.timeline.slice(0, maxTimeline)

  pruned.evidence = Math.max(0, beforeEvidence - worldModel.beliefs.reduce(
    (sum, b) => sum + b.supportingEvidence.length + b.contradictingEvidence.length, 0,
  ))
  pruned.history = Math.max(0, beforeHistory - worldModel.beliefs.reduce((sum, b) => sum + b.history.length, 0))
  pruned.timeline = Math.max(0, normalized.timeline.length - timeline.length)
  pruned.questions = Math.max(0, normalized.worldModel.openQuestions.length - worldModel.openQuestions.length)
  pruned.contradictions = Math.max(0, normalized.worldModel.contradictions.length - worldModel.contradictions.length)
  pruned.hypotheses = Math.max(0, normalized.worldModel.currentHypotheses.length - worldModel.currentHypotheses.length)
  pruned.unknowns = Math.max(0, normalized.worldModel.unknowns.length - worldModel.unknowns.length)
  pruned.beliefs = Math.max(0, normalized.worldModel.beliefs.length - worldModel.beliefs.length)

  return {
    store: {
      worldModel,
      timeline,
      lastKernelSyncAt: normalized.lastKernelSyncAt,
    },
    pruned,
  }
}

export function getCognitiveStoreSizeBytes(store: CognitiveStore): number {
  const json = JSON.stringify(store)
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length
  }
  return new Blob([json]).size
}

export function cognitiveStoreSnapshot(store: CognitiveStore): string {
  return JSON.stringify(compactCognitiveStore(store).store)
}

export function getCognitiveStoreStats(store: CognitiveStore): CognitiveStoreStats {
  const compact = compactCognitiveStore(store).store
  return {
    beliefs: compact.worldModel.beliefs.length,
    evidence: compact.worldModel.beliefs.reduce(
      (sum, b) => sum + b.supportingEvidence.length + b.contradictingEvidence.length, 0,
    ),
    history: compact.worldModel.beliefs.reduce((sum, b) => sum + b.history.length, 0),
    timeline: compact.timeline.length,
    questions: compact.worldModel.openQuestions.length,
    contradictions: compact.worldModel.contradictions.length,
    hypotheses: compact.worldModel.currentHypotheses.length,
    unknowns: compact.worldModel.unknowns.length,
    sizeBytes: getCognitiveStoreSizeBytes(compact),
  }
}

export function pruneCognitiveStoreForBudget(
  store: CognitiveStore,
  budgetBytes = COGNITIVE_RETENTION.STORAGE_BUDGET_BYTES,
): CompactCognitiveStoreResult {
  let current = compactCognitiveStore(store, false)
  if (getCognitiveStoreSizeBytes(current.store) <= budgetBytes) return current

  current = compactCognitiveStore(current.store, true)
  if (getCognitiveStoreSizeBytes(current.store) <= budgetBytes) return current

  const aggressiveWorld = {
    ...current.store.worldModel,
    beliefs: current.store.worldModel.beliefs.map((belief) => ({
      ...belief,
      supportingEvidence: belief.supportingEvidence.slice(0, 8),
      contradictingEvidence: belief.contradictingEvidence.slice(0, 4),
      history: belief.history.slice(-8),
    })),
    openQuestions: current.store.worldModel.openQuestions
      .filter((q) => q.uncertaintyReduction >= 0.7)
      .slice(0, 5),
    contradictions: current.store.worldModel.contradictions.filter((c) => !c.resolved).slice(0, 10),
    currentHypotheses: current.store.worldModel.currentHypotheses
      .filter((h) => h.status === 'open')
      .slice(0, 6),
    unknowns: current.store.worldModel.unknowns
      .filter((u) => u.importance === 'critical' || u.importance === 'high')
      .slice(0, 8),
  }

  return compactCognitiveStore({
    ...current.store,
    worldModel: aggressiveWorld,
    timeline: current.store.timeline.slice(0, 40),
  }, true)
}

export interface CompactStorageReport {
  store: CognitiveStore
  beforeBytes: number
  afterBytes: number
  pruned: CompactCognitiveStoreResult['pruned']
  stats: CognitiveStoreStats
}

export function compactStoredCognitiveModel(store?: CognitiveStore): CompactStorageReport {
  const source = store ?? normalizeCognitiveStore(null)
  const beforeBytes = getCognitiveStoreSizeBytes(source)
  const compacted = pruneCognitiveStoreForBudget(source)
  const afterBytes = getCognitiveStoreSizeBytes(compacted.store)
  return {
    store: compacted.store,
    beforeBytes,
    afterBytes,
    pruned: compacted.pruned,
    stats: getCognitiveStoreStats(compacted.store),
  }
}
