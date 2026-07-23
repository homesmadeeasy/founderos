/**
 * IdentityEngine — sole mutation authority for FounderOS identity.
 * Specialists must only read via the public view API.
 */

import type {
  DeclareFactInput,
  IdentityDatastore,
  IdentityEvidence,
  IdentityFact,
  IdentityHistoryEntry,
  IdentitySpecialistView,
  ObservationSignal,
  ReviewFactInput,
  SpecialistId,
} from './identityTypes'
import { declaredConfidence, calculateObservationConfidence, daysBetween } from './identityConfidence'
import { averageEvidenceWeight, createEvidence, newestEvidenceAt } from './identityEvidence'
import {
  appendHistoryEntry,
  factHistorySnapshot,
  recentHistory,
} from './identityHistory'
import {
  buildObservedFactFromCandidate,
  confidenceForCandidate,
  inferIdentityCandidates,
} from './identityInference'
import { emptyIdentityDatastore } from './identitySchema'
import { displayValueFromUnknown, newIdentityId, nowISO } from './identityUtils'
import {
  isActiveFact,
  validateDeclareFactInput,
  validateReviewFactInput,
} from './identityValidation'
import type { IdentityRepository } from './IdentityRepository'

export class IdentityEngine {
  constructor(private readonly repo: IdentityRepository) {}

  async load(): Promise<IdentityDatastore> {
    return this.repo.load()
  }

  async setEnabledSpecialists(specialists: SpecialistId[]): Promise<IdentityDatastore> {
    const store = await this.repo.load()
    const next: IdentityDatastore = {
      ...store,
      enabledSpecialists: [...new Set(specialists.filter(Boolean))],
      updatedAt: nowISO(),
    }
    await this.repo.save(next)
    return next
  }

  async markOnboardingComplete(complete = true): Promise<IdentityDatastore> {
    const store = await this.repo.load()
    const next = { ...store, onboardingComplete: complete, updatedAt: nowISO() }
    await this.repo.save(next)
    return next
  }

  /**
   * Declare a user-stated fact. Never overwritten by observations of the same key.
   */
  async declareFact(input: DeclareFactInput): Promise<{ store: IdentityDatastore; fact: IdentityFact }> {
    const error = validateDeclareFactInput(input)
    if (error) throw new Error(error)

    const store = await this.repo.load()
    const now = nowISO()
    const existing = store.facts.find(
      f => f.kind === 'declared' && f.key === input.key && f.status === 'active',
    )

    const evidence = (input.evidenceSummaries ?? []).map(summary => createEvidence({
      summary,
      source: input.source ?? { kind: 'user_input', label: 'User' },
    }))

    let fact: IdentityFact
    let history: IdentityHistoryEntry[]
    let facts: IdentityFact[]

    if (existing) {
      const previous = factHistorySnapshot(existing)
      fact = {
        ...existing,
        category: input.category,
        label: input.label,
        value: input.value,
        displayValue: input.displayValue ?? displayValueFromUnknown(input.value),
        confidence: declaredConfidence(),
        source: input.source ?? { kind: 'user_input', label: 'User' },
        evidenceIds: [...existing.evidenceIds, ...evidence.map(e => e.id)],
        relevanceTags: input.relevanceTags ?? existing.relevanceTags,
        updatedAt: now,
      }
      history = [
        ...store.history,
        appendHistoryEntry({
          factId: fact.id,
          changeType: 'updated',
          previousSnapshot: previous,
          nextSnapshot: factHistorySnapshot(fact),
          actor: 'user',
          reason: 'User updated declared fact',
        }),
      ]
      facts = store.facts.map(f => f.id === fact.id ? fact : f)
    } else {
      fact = {
        id: newIdentityId(),
        category: input.category,
        key: input.key,
        label: input.label,
        value: input.value,
        displayValue: input.displayValue ?? displayValueFromUnknown(input.value),
        kind: 'declared',
        confidence: declaredConfidence(),
        source: input.source ?? { kind: 'user_input', label: 'User' },
        evidenceIds: evidence.map(e => e.id),
        status: 'active',
        relevanceTags: input.relevanceTags ?? [],
        createdAt: now,
        updatedAt: now,
      }
      history = [
        ...store.history,
        appendHistoryEntry({
          factId: fact.id,
          changeType: 'created',
          nextSnapshot: factHistorySnapshot(fact),
          actor: 'user',
          reason: 'User declared fact',
        }),
      ]
      facts = [...store.facts, fact]
    }

    // Link contradiction notes on observed facts with same key — never overwrite declared.
    facts = facts.map(f => {
      if (f.kind !== 'observed' || f.key !== fact.key || f.status !== 'active') return f
      return {
        ...f,
        contradictsFactId: fact.id,
        contradictionNote:
          `Declared “${fact.displayValue}” while observed “${f.displayValue}”. Both are retained.`,
        updatedAt: now,
      }
    })

    const next: IdentityDatastore = {
      ...store,
      facts,
      evidence: [...store.evidence, ...evidence.map(e => ({ ...e, factId: fact.id }))],
      history,
      updatedAt: now,
    }
    await this.repo.save(next)
    return { store: next, fact }
  }

  /** Ingest signals and upsert observed facts without clobbering declared values. */
  async ingestSignals(signals: ObservationSignal[]): Promise<{
    store: IdentityDatastore
    upserted: IdentityFact[]
    skipped: { reason: string; signalType?: string }[]
  }> {
    const store = await this.repo.load()
    const { candidates, skipped } = inferIdentityCandidates(signals)
    const upserted: IdentityFact[] = []
    let facts = [...store.facts]
    let evidence = [...store.evidence]
    let history = [...store.history]
    const now = nowISO()

    for (const candidate of candidates) {
      const confidence = confidenceForCandidate(candidate)
      // Require minimum confidence to materialize an observation.
      if (confidence < 0.55) {
        skipped.push({ reason: `Confidence ${confidence} below threshold for ${candidate.key}` })
        continue
      }

      const declared = facts.find(f => f.kind === 'declared' && f.key === candidate.key && f.status === 'active')
      const existingObserved = facts.find(f => f.kind === 'observed' && f.key === candidate.key && f.status === 'active')

      const fact = buildObservedFactFromCandidate(candidate, confidence, existingObserved?.id)
      if (declared) {
        fact.contradictsFactId = declared.id
        fact.contradictionNote =
          `You declared “${declared.displayValue}”, but behaviour suggests “${fact.displayValue}”.`
      }

      const linkedEvidence = candidate.evidence.map(e => ({ ...e, factId: fact.id }))
      evidence = [...evidence.filter(e => e.factId !== fact.id), ...linkedEvidence]

      if (existingObserved) {
        const previous = factHistorySnapshot(existingObserved)
        fact.createdAt = existingObserved.createdAt
        facts = facts.map(f => f.id === fact.id ? fact : f)
        history.push(appendHistoryEntry({
          factId: fact.id,
          changeType: 'confidence_changed',
          previousSnapshot: previous,
          nextSnapshot: factHistorySnapshot(fact),
          actor: 'inference',
          reason: 'Observation refreshed from new evidence',
        }))
      } else {
        facts.push(fact)
        history.push(appendHistoryEntry({
          factId: fact.id,
          changeType: 'created',
          nextSnapshot: factHistorySnapshot(fact),
          actor: 'inference',
          reason: 'New observation inferred',
        }))
      }
      upserted.push(fact)
    }

    const next: IdentityDatastore = {
      ...store,
      facts,
      evidence,
      history,
      updatedAt: now,
    }
    await this.repo.save(next)
    return { store: next, upserted, skipped }
  }

  async reviewFact(input: ReviewFactInput): Promise<{ store: IdentityDatastore; fact: IdentityFact }> {
    const error = validateReviewFactInput(input)
    if (error) throw new Error(error)

    const store = await this.repo.load()
    const fact = store.facts.find(f => f.id === input.factId)
    if (!fact) throw new Error('Fact not found.')

    const previous = factHistorySnapshot(fact)
    const now = nowISO()
    let nextFact: IdentityFact = { ...fact, updatedAt: now }
    let changeType: IdentityHistoryEntry['changeType'] = 'updated'
    let reason = input.reason

    if (input.action === 'confirm') {
      nextFact = {
        ...nextFact,
        confidence: fact.kind === 'declared' ? 1 : calculateObservationConfidence({
          observationCount: fact.evidenceIds.length || 3,
          averageWeight: 0.9,
          consistency: 1,
          daysSinceLastEvidence: 0,
          contradictionCount: 0,
          manuallyConfirmed: true,
          previousConfidence: fact.confidence,
        }),
        status: 'active',
        source: fact.kind === 'observed'
          ? { kind: 'manual_override', label: 'User confirmed observation' }
          : fact.source,
      }
      changeType = 'confirmed'
      reason = reason ?? 'User confirmed'
    } else if (input.action === 'reject') {
      nextFact = {
        ...nextFact,
        status: 'rejected',
        confidence: calculateObservationConfidence({
          observationCount: fact.evidenceIds.length,
          averageWeight: 0.5,
          consistency: 0.2,
          daysSinceLastEvidence: 0,
          contradictionCount: 1,
          manuallyRejected: true,
          previousConfidence: fact.confidence,
        }),
        source: { kind: 'manual_override', label: 'User rejected inference' },
      }
      changeType = 'rejected'
      reason = reason ?? 'User rejected inference'
    } else if (input.action === 'dismiss') {
      nextFact = { ...nextFact, status: 'dismissed' }
      changeType = 'dismissed'
      reason = reason ?? 'User dismissed'
    } else if (input.action === 'edit') {
      nextFact = {
        ...nextFact,
        value: input.editedValue!,
        displayValue: input.editedDisplayValue ?? displayValueFromUnknown(input.editedValue),
        kind: fact.kind === 'observed' ? 'declared' : fact.kind,
        confidence: declaredConfidence(),
        source: { kind: 'manual_override', label: 'User edited identity fact' },
        status: 'active',
        contradictsFactId: undefined,
        contradictionNote: undefined,
      }
      changeType = 'corrected'
      reason = reason ?? 'User edited fact'
    }

    const next: IdentityDatastore = {
      ...store,
      facts: store.facts.map(f => f.id === nextFact.id ? nextFact : f),
      history: [
        ...store.history,
        appendHistoryEntry({
          factId: nextFact.id,
          changeType,
          previousSnapshot: previous,
          nextSnapshot: factHistorySnapshot(nextFact),
          actor: 'user',
          reason,
        }),
      ],
      updatedAt: now,
    }
    await this.repo.save(next)
    return { store: next, fact: nextFact }
  }

  async getEvidenceForFact(factId: string): Promise<IdentityEvidence[]> {
    const store = await this.repo.load()
    return store.evidence.filter(e => e.factId === factId || store.facts.find(f => f.id === factId)?.evidenceIds.includes(e.id))
  }

  async getRecentHistory(limit = 20): Promise<IdentityHistoryEntry[]> {
    const store = await this.repo.load()
    return recentHistory(store.history, limit)
  }

  /** Read-only projection for specialists. */
  getSpecialistView(store: IdentityDatastore, specialistId?: SpecialistId): IdentitySpecialistView {
    const active = store.facts.filter(isActiveFact)
    const declared = active.filter(f => f.kind === 'declared')
    const observed = active.filter(f => f.kind === 'observed')
    const contradictions = observed.filter(f => Boolean(f.contradictsFactId))

    const byCategory: IdentitySpecialistView['byCategory'] = {}
    for (const fact of active) {
      const list = byCategory[fact.category] ?? []
      list.push(fact)
      byCategory[fact.category] = list
    }

    const byKey: IdentitySpecialistView['byKey'] = {}
    for (const fact of active) {
      const slot = byKey[fact.key] ?? {}
      if (fact.kind === 'declared') slot.declared = fact
      else slot.observed = fact
      byKey[fact.key] = slot
    }

    const relevant = specialistId
      ? active.filter(f =>
        f.relevanceTags.length === 0
        || f.relevanceTags.some(t => t === specialistId || t.includes(specialistId)),
      )
      : active

    const narrativeHints = relevant.slice(0, 12).map(f => {
      const conf = Math.round(f.confidence * 100)
      const kind = f.kind === 'declared' ? 'Declared' : 'Observed'
      return `${kind}: ${f.label} — ${f.displayValue} (${conf}% confidence)`
    })

    return {
      declared,
      observed,
      contradictions,
      byCategory,
      byKey,
      narrativeHints,
      updatedAt: store.updatedAt,
    }
  }

  /** Recompute confidence for an observed fact from linked evidence (utility for tests/sync). */
  recomputeObservedConfidence(fact: IdentityFact, evidence: IdentityEvidence[]): number {
    const linked = evidence.filter(e => fact.evidenceIds.includes(e.id) || e.factId === fact.id)
    const newest = newestEvidenceAt(linked)
    return calculateObservationConfidence({
      observationCount: linked.length,
      averageWeight: averageEvidenceWeight(linked),
      consistency: Math.min(1, linked.length / 6),
      daysSinceLastEvidence: newest ? daysBetween(newest) : 999,
      contradictionCount: fact.contradictsFactId ? 1 : 0,
      previousConfidence: fact.confidence,
    })
  }
}

export function createEmptyIdentityStore(): IdentityDatastore {
  return emptyIdentityDatastore()
}
