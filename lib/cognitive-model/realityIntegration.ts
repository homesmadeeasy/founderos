import type { CognitiveStore } from './beliefTypes'
import type { ReconciliationResult, UserEvidenceInput } from './realityTypes'
import { getCognitiveStore, persistCognitiveStore, setCognitiveStore } from './cognitiveOrchestrator'
import { migrateCognitiveStoreToRealityV2, reconcileUserEvidence } from './realityReducer'
import type { ConversationBelief, ConversationSession } from '@/lib/conversation/conversationTypes'
import { VALIDATION_BELIEF_KEYS, updateBelief } from '@/lib/conversation/conversationBeliefs'
import { nowISO } from './cognitiveUtils'

export function reconcileAndPersistUserEvidence(
  store: CognitiveStore,
  input: UserEvidenceInput,
  options?: { llmClaims?: import('./realityTypes').RealityClaim[] },
): ReconciliationResult {
  const migrated = migrateCognitiveStoreToRealityV2(store)
  const result = reconcileUserEvidence(migrated, input, options)
  setCognitiveStore(result.store)
  persistCognitiveStore(result.store)
  return result
}

export function reconcileUserMessage(
  input: UserEvidenceInput,
  options?: { llmClaims?: import('./realityTypes').RealityClaim[] },
): ReconciliationResult {
  return reconcileAndPersistUserEvidence(getCognitiveStore(), input, options)
}

export function syncSessionBeliefsFromReconciliation(
  session: ConversationSession,
  result: ReconciliationResult,
  messageId: string,
): ConversationSession {
  if (!result.changes.length && result.idempotent) return session

  let beliefs = session.beliefs ?? []
  const snapshot = result.snapshot

  const usersTested = snapshot.activeBeliefs.find(b => b.predicate === 'validation.users_tested')
  if (usersTested) {
    beliefs = updateBelief(beliefs, VALIDATION_BELIEF_KEYS.usersTested, {
      value: usersTested.normalizedValue === 'true',
      displayValue: usersTested.statement.slice(0, 80),
      status: usersTested.sourceClassification === 'user_reported' ? 'user_claimed' : 'confirmed',
      confidence: usersTested.confidence,
      evidenceIds: ['ev-user-reports-testing'],
    }, messageId)
  }

  const count = snapshot.activeBeliefs.find(b => b.predicate === 'validation.tester_count')
  if (count) {
    beliefs = updateBelief(beliefs, VALIDATION_BELIEF_KEYS.userCount, {
      value: Number(count.normalizedValue),
      displayValue: String(count.normalizedValue),
      status: 'confirmed',
      confidence: count.confidence,
    }, messageId)
  }

  const surface = snapshot.activeBeliefs.find(b => b.predicate === 'validation.tested_surface')
  if (surface) {
    beliefs = updateBelief(beliefs, VALIDATION_BELIEF_KEYS.testedSurface, {
      value: surface.normalizedValue,
      displayValue: surface.normalizedValue.replace(/_/g, ' '),
      status: 'confirmed',
      confidence: surface.confidence,
    }, messageId)
  }

  const negative = snapshot.activeBeliefs.find(b => b.predicate === 'validation.comprehension_negative')
  if (negative) {
    beliefs = updateBelief(beliefs, VALIDATION_BELIEF_KEYS.confusion, {
      value: negative.statement,
      displayValue: negative.statement.slice(0, 60),
      status: 'confirmed',
      confidence: negative.confidence,
    }, messageId)
  }

  const positive = snapshot.activeBeliefs.find(b => b.predicate === 'validation.comprehension_positive')
  if (positive) {
    beliefs = updateBelief(beliefs, VALIDATION_BELIEF_KEYS.comprehension, {
      value: true,
      displayValue: `${positive.normalizedValue} understood value`,
      status: 'confirmed',
      confidence: positive.confidence,
    }, messageId)
  }

  return {
    ...session,
    beliefs,
    realityChanges: result.changes.map(c => ({
      id: c.id,
      label: c.newStatement.slice(0, 60),
      previous: c.previousStatement.slice(0, 60),
      next: c.newStatement.slice(0, 60),
      timestamp: c.timestamp,
    })),
    updatedAt: nowISO(),
  }
}
