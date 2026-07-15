import type { CognitiveStore } from './beliefTypes'
import type {
  ReconciliationResult,
  RealitySnapshot,
  RealityStoreMeta,
  UserEvidenceInput,
} from './realityTypes'
import {
  buildIdempotencyKey,
  extractClaimsFromText,
  normalizeClaimKey,
} from './claimExtraction'
import { reconcileClaimsToBeliefs, buildHypothesesFromClaims, buildUnknownsFromClaims, computePositioningRisk, computeValidationScoreFromBeliefs, ensureSeedBeliefs, toRealityBelief, toRealityHypothesis, toRealityUnknown } from './beliefReconciliation'
import { DEFAULT_ENTITIES } from './entityResolution'
import { appendTimeline } from './beliefTimeline'
import { updateWorldModel } from './beliefStorage'
import { compactRealityMeta, pruneRealityChanges } from './realityCompaction'
import { selectNextRealityQuestion } from './realityQueries'
import { buildResponseFromReconciliation } from './realityResponse'
import { newCognitiveId, nowISO } from './cognitiveUtils'
import { getHighestValueUnknown } from './realityQueries'

let reconcilingReality = false

function defaultRealityMeta(): RealityStoreMeta {
  return {
    version: 2,
    processedMessageKeys: [],
    lastCompactionAt: null,
    approximateBytes: 0,
    droppedArchiveCount: 0,
  }
}

function ensureRealityMeta(store: CognitiveStore): RealityStoreMeta {
  return store.realityMeta ?? defaultRealityMeta()
}

export function isRealityReconcileInProgress(): boolean {
  return reconcilingReality
}

export function buildRealitySnapshot(store: CognitiveStore, changes: import('./realityTypes').RealityChange[]): RealitySnapshot {
  const world = store.worldModel
  const activeBeliefs = ensureSeedBeliefs(world.beliefs)
    .filter(b => !b.reality?.supersededAt)
    .map(toRealityBelief)
    .sort((a, b) => b.confidence - a.confidence)

  const validationScore = computeValidationScoreFromBeliefs(world.beliefs)
  const positioningRisk = computePositioningRisk(world.beliefs)

  return {
    updatedAt: nowISO(),
    entities: DEFAULT_ENTITIES,
    activeBeliefs,
    highestImpactChanges: changes.slice(0, 6),
    biggestUnknowns: world.unknowns.map(toRealityUnknown).sort((a, b) => b.valueScore - a.valueScore).slice(0, 5),
    contradictions: world.contradictions.filter(c => !c.resolved).slice(0, 5),
    hypotheses: world.currentHypotheses.map(toRealityHypothesis).slice(0, 6),
    domainSummaries: [
      {
        domain: 'validation',
        headline: validationScore >= 45
          ? 'User-reported testing exists'
          : 'Validation evidence still weak',
        confidence: validationScore,
        primaryRisk: positioningRisk > 50 ? 'Positioning clarity' : undefined,
      },
      {
        domain: 'product',
        headline: positioningRisk > 55
          ? 'Messaging may read as generic productivity tool'
          : 'Product comprehension forming',
        confidence: 100 - positioningRisk,
        primaryRisk: positioningRisk > 50 ? 'Positioning' : undefined,
      },
    ],
    validationScore,
    positioningRisk,
  }
}

export function reconcileUserEvidence(
  store: CognitiveStore,
  input: UserEvidenceInput,
  options?: { llmClaims?: import('./realityTypes').RealityClaim[] },
): ReconciliationResult {
  if (reconcilingReality) {
    const snapshot = store.worldModel.realitySnapshot ?? buildRealitySnapshot(store, [])
    return {
      store,
      snapshot,
      claims: [],
      changes: [],
      hypotheses: [],
      unknowns: [],
      nextQuestion: selectNextRealityQuestion(snapshot).text,
      nextQuestionPurpose: 'Deferred — reconciliation in progress',
      responseMessage: '',
      reasoningSummary: 'Reconciliation already in progress',
      idempotent: true,
      validationDelta: 0,
      positioningDelta: 0,
    }
  }

  reconcilingReality = true
  try {
    const meta = ensureRealityMeta(store)
    const prevValidation = store.worldModel.realitySnapshot?.validationScore
      ?? computeValidationScoreFromBeliefs(store.worldModel.beliefs)
    const prevPositioning = store.worldModel.realitySnapshot?.positioningRisk
      ?? computePositioningRisk(store.worldModel.beliefs)

    const claims = options?.llmClaims?.length
      ? options.llmClaims
      : extractClaimsFromText(input.userMessage)

    if (claims.length === 0) {
      const snapshot = store.worldModel.realitySnapshot ?? buildRealitySnapshot(store, [])
      return {
        store,
        snapshot,
        claims: [],
        changes: [],
        hypotheses: [],
        unknowns: [],
        nextQuestion: selectNextRealityQuestion(snapshot).text,
        nextQuestionPurpose: 'No structured claims extracted',
        responseMessage: '',
        reasoningSummary: 'No claims to reconcile',
        idempotent: true,
        validationDelta: 0,
        positioningDelta: 0,
      }
    }

    const newKeys: string[] = []
    const unprocessedClaims: typeof claims = []
    for (const claim of claims) {
      const key = buildIdempotencyKey(input.sessionId, input.messageId, normalizeClaimKey(claim))
      newKeys.push(key)
      if (!meta.processedMessageKeys.includes(key)) {
        unprocessedClaims.push(claim)
      }
    }

    if (unprocessedClaims.length === 0) {
      const snapshot = store.worldModel.realitySnapshot ?? buildRealitySnapshot(store, [])
      return {
        store,
        snapshot,
        claims,
        changes: [],
        hypotheses: [],
        unknowns: [],
        nextQuestion: selectNextRealityQuestion(snapshot).text,
        nextQuestionPurpose: 'Already recorded',
        responseMessage: buildResponseFromReconciliation({
          idempotent: true,
          changes: [],
          snapshot,
          claims,
        }),
        reasoningSummary: 'Idempotent — claims already processed',
        idempotent: true,
        validationDelta: 0,
        positioningDelta: 0,
      }
    }

    const { beliefs, changes, contradictions } = reconcileClaimsToBeliefs(
      store.worldModel.beliefs,
      unprocessedClaims,
      input.userMessage,
    )

    const hypotheses = buildHypothesesFromClaims(unprocessedClaims, store.worldModel.currentHypotheses)
    const unknowns = buildUnknownsFromClaims(unprocessedClaims, store.worldModel.unknowns)

    const validationScore = computeValidationScoreFromBeliefs(beliefs)
    const positioningRisk = computePositioningRisk(beliefs)

    let risks = [...store.worldModel.currentRisks]
    if (positioningRisk > 55 && !risks.some(r => /positioning|messaging/i.test(r))) {
      risks = ['Positioning clarity', ...risks]
    }
    if (validationScore >= 45) {
      risks = risks.filter(r => !/no users|get your first users|talk to users first/i.test(r))
    }

    let bottlenecks = [...store.worldModel.currentBottlenecks]
    if (validationScore >= 45 && positioningRisk > 50) {
      bottlenecks = ['Positioning clarity', ...bottlenecks.filter(b => !/validation|users/i.test(b))]
    }

    const worldModel = {
      ...store.worldModel,
      beliefs,
      contradictions: [...store.worldModel.contradictions, ...contradictions].slice(-30),
      currentHypotheses: hypotheses,
      unknowns,
      currentRisks: risks.slice(0, 6),
      currentBottlenecks: bottlenecks.slice(0, 4),
      validation: {
        ...store.worldModel.validation,
        score: validationScore,
        confidence: Math.max(store.worldModel.validation.confidence, validationScore),
        summary: validationScore >= 45
          ? 'User-reported testing recorded'
          : 'Awaiting validation evidence',
      },
      confidenceLevels: {
        ...store.worldModel.confidenceLevels,
        validation: validationScore,
      },
      updatedAt: nowISO(),
    }

    const prunedChanges = pruneRealityChanges([
      ...(store.worldModel.realitySnapshot?.highestImpactChanges ?? []),
      ...changes,
    ])

    const snapshot = buildRealitySnapshot({ ...store, worldModel }, changes)
    worldModel.realitySnapshot = { ...snapshot, highestImpactChanges: prunedChanges }

    let nextStore = updateWorldModel({ ...store, realityMeta: meta }, worldModel)
    nextStore = {
      ...nextStore,
      realityMeta: compactRealityMeta({
        ...meta,
        processedMessageKeys: [...meta.processedMessageKeys, ...newKeys],
      }),
    }

    if (changes.length) {
      nextStore = appendTimeline(nextStore, {
        type: 'belief_updated',
        title: 'Reality model reconciled',
        detail: changes.map(c => c.newStatement).join('; ').slice(0, 200),
        relatedIds: changes.map(c => c.beliefId),
      })
    }

    const topUnknown = getHighestValueUnknown(snapshot)
    const nextQuestion = selectNextRealityQuestion(snapshot)

    const result: ReconciliationResult = {
      store: nextStore,
      snapshot: worldModel.realitySnapshot,
      claims: unprocessedClaims,
      changes,
      hypotheses: hypotheses.map(toRealityHypothesis),
      unknowns: unknowns.map(toRealityUnknown),
      nextQuestion: nextQuestion.text,
      nextQuestionPurpose: nextQuestion.purpose,
      responseMessage: buildResponseFromReconciliation({
        idempotent: false,
        changes,
        snapshot: worldModel.realitySnapshot,
        claims: unprocessedClaims,
        nextQuestion: nextQuestion.text,
      }),
      reasoningSummary: changes.length
        ? `Reconciled ${unprocessedClaims.length} claim(s), ${changes.length} belief change(s)`
        : 'No belief changes',
      idempotent: false,
      validationDelta: validationScore - prevValidation,
      positioningDelta: positioningRisk - prevPositioning,
    }

    return result
  } finally {
    reconcilingReality = false
  }
}

export function migrateCognitiveStoreToRealityV2(store: CognitiveStore): CognitiveStore {
  const meta = ensureRealityMeta(store)
  if (meta.version >= 2 && store.worldModel.realitySnapshot) return store

  const beliefs = ensureSeedBeliefs(store.worldModel.beliefs)
  const snapshot = buildRealitySnapshot({ ...store, worldModel: { ...store.worldModel, beliefs } }, [])

  return {
    ...store,
    realityMeta: { ...meta, version: 2 },
    worldModel: {
      ...store.worldModel,
      beliefs,
      realitySnapshot: snapshot,
    },
  }
}
