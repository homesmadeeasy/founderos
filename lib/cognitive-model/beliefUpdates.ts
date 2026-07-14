import type {
  Belief,
  BeliefEvidence,
  BeliefHistoryEntry,
  BeliefSource,
  BeliefTopic,
  BeliefUpdateResult,
  Unknown,
} from './beliefTypes'
import { applyEvidenceToBelief, computeBeliefConfidence, deriveStatus } from './beliefConfidence'
import { detectContradictions } from './beliefContradictions'
import { questionForBelief } from './beliefQuestions'
import { clampConfidence, newBeliefId, newCognitiveId, normalizeStatement, nowISO } from './cognitiveUtils'
import { mergeEvidenceLists, evidenceStableKey } from './cognitiveCompaction'

function beliefStateKey(belief: Belief): string {
  return [
    belief.statement,
    belief.status,
    belief.confidence,
    belief.supportingEvidence.map((e) => evidenceStableKey(e, belief.id)).join(','),
    belief.contradictingEvidence.map((e) => evidenceStableKey(e, belief.id)).join(','),
  ].join('|')
}

export function createBelief(
  statement: string,
  topic: BeliefTopic,
  source: BeliefSource,
  confidence = 40,
  importance: Belief['importance'] = 'medium',
): Belief {
  const now = nowISO()
  const status = deriveStatus(confidence, false)
  return {
    id: newBeliefId(),
    topic,
    statement,
    confidence: clampConfidence(confidence),
    status,
    importance,
    source,
    createdAt: now,
    updatedAt: now,
    lastReferenced: now,
    supportingEvidence: [],
    contradictingEvidence: [],
    history: [],
  }
}

export function updateBelief(
  belief: Belief,
  updates: {
    statement?: string
    confidence?: number
    evidence?: BeliefEvidence
    reason: string
    triggerEvent?: string
  },
): BeliefUpdateResult {
  let next = { ...belief, lastReferenced: nowISO() }
  const prevConfidence = belief.confidence
  const prevStatus = belief.status

  if (updates.evidence) {
    next = applyEvidenceToBelief(next, updates.evidence)
  }
  if (updates.statement) next.statement = updates.statement
  if (updates.confidence !== undefined) {
    next.confidence = clampConfidence(updates.confidence)
    next.status = deriveStatus(next.confidence, next.contradictingEvidence.length > 0)
  }

  const changed = beliefStateKey(belief) !== beliefStateKey(next)
  if (!changed) {
    return {
      belief: next,
      historyEntry: belief.history[belief.history.length - 1] ?? {
        id: newCognitiveId('hist'),
        timestamp: nowISO(),
        previousStatus: belief.status,
        newStatus: next.status,
        previousConfidence: belief.confidence,
        newConfidence: next.confidence,
        reason: 'No meaningful change',
      },
      contradictions: detectContradictions([next]),
      newQuestions: [],
      resolvedUnknowns: [],
    }
  }

  const historyEntry: BeliefHistoryEntry = {
    id: newCognitiveId('hist'),
    timestamp: nowISO(),
    previousStatus: prevStatus,
    newStatus: next.status,
    previousConfidence: prevConfidence,
    newConfidence: next.confidence,
    reason: updates.reason,
    triggerEvent: updates.triggerEvent,
  }

  next = {
    ...next,
    updatedAt: nowISO(),
    history: [...next.history, historyEntry],
  }

  const contradictions = detectContradictions([next])
  const newQuestions = next.confidence < 50 ? [questionForBelief(next)] : []

  return { belief: next, historyEntry, contradictions, newQuestions, resolvedUnknowns: [] }
}

export function upsertBeliefByStatement(beliefs: Belief[], candidate: Belief): Belief[] {
  const key = normalizeStatement(candidate.statement)
  const idx = beliefs.findIndex((b) => normalizeStatement(b.statement) === key)
  if (idx < 0) return [...beliefs, candidate]
  const prev = beliefs[idx]!
  const merged: Belief = {
    ...prev,
    ...candidate,
    id: prev.id,
    createdAt: prev.createdAt,
    history: prev.history,
    supportingEvidence: prev.supportingEvidence,
    contradictingEvidence: prev.contradictingEvidence,
    confidence: prev.supportingEvidence.length > 0 || prev.contradictingEvidence.length > 0 || prev.history.length > 0
      ? prev.confidence
      : candidate.confidence,
    status: prev.history.length > 0 ? prev.status : candidate.status,
    updatedAt: prev.updatedAt,
    lastReferenced: prev.lastReferenced,
  }
  if (beliefStateKey(prev) === beliefStateKey(merged)) {
    return beliefs
  }
  return beliefs.map((b, i) => (i === idx ? { ...merged, updatedAt: nowISO(), lastReferenced: nowISO() } : b))
}

export function upsertBeliefsByStatement(beliefs: Belief[], incoming: Belief[]): Belief[] {
  let next = [...beliefs]
  for (const belief of incoming) {
    next = upsertBeliefByStatement(next, belief)
  }
  return next
}

export function mergeBeliefs(existing: Belief[], incoming: Belief[]): Belief[] {
  const map = new Map(existing.map((b) => [b.id, b]))
  for (const b of incoming) {
    const prev = map.get(b.id)
    if (!prev) {
      map.set(b.id, b)
      continue
    }
    map.set(b.id, {
      ...prev,
      ...b,
      history: [...prev.history, ...b.history.filter((h) => !prev.history.some((p) => p.id === h.id))],
      supportingEvidence: mergeEvidenceLists(prev.supportingEvidence, b.supportingEvidence, b.id),
      contradictingEvidence: mergeEvidenceLists(prev.contradictingEvidence, b.contradictingEvidence, b.id),
    })
  }
  return Array.from(map.values())
}

export function resolveUnknown(unknowns: Unknown[], unknownId: string): Unknown[] {
  return unknowns.filter((u) => u.id !== unknownId)
}

export function beliefsChangedSince(beliefs: Belief[], sinceISO: string): Belief[] {
  const since = new Date(sinceISO).getTime()
  return beliefs.filter((b) => b.history.some((h) => new Date(h.timestamp).getTime() > since))
}

export function recomputeBelief(belief: Belief): Belief {
  const confidence = computeBeliefConfidence(
    belief.confidence,
    belief.supportingEvidence,
    belief.contradictingEvidence,
  )
  const next = {
    ...belief,
    confidence,
    status: deriveStatus(confidence, belief.contradictingEvidence.length > 0 && belief.supportingEvidence.length > 0),
  }
  if (beliefStateKey(belief) === beliefStateKey(next)) {
    return belief
  }
  return next
}
