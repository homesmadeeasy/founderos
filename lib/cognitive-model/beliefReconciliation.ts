import type { Belief, BeliefContradiction, BeliefTopic, CognitiveStore, Hypothesis, Unknown } from './beliefTypes'
import type { RealityBelief, RealityChange, RealityClaim, RealityHypothesis, RealitySourceClass, RealityUnknown } from './realityTypes'
import { createEvidence } from './beliefEvidence'
import { detectContradictions } from './beliefContradictions'
import { createBelief, updateBelief } from './beliefUpdates'
import { domainForPredicate, surfaceLabel } from './entityResolution'
import { messageDetailScore } from './claimExtraction'
import { clampConfidence, newBeliefId, newCognitiveId, nowISO, truncateText } from './cognitiveUtils'

export const REALITY_BELIEF_IDS = {
  usersTested: 'belief-validation-users-tested',
  absenceInference: 'belief-validation-absence-inference',
  testerCount: 'belief-validation-tester-count',
  testedSurface: 'belief-validation-tested-surface',
  comprehensionRate: 'belief-validation-comprehension-rate',
  positioningWeak: 'belief-product-positioning-weak',
} as const

const PREDICATE_STATEMENTS: Record<string, (value: string | number | boolean, entityId?: string) => string> = {
  'validation.users_tested': (v) => v
    ? 'Real users have tested FounderOS'
    : 'No real-user testing confirmed',
  'validation.tester_count': (v) => `${v} people tested FounderOS`,
  'validation.tested_surface': (v, entityId) =>
    `Users tested the ${surfaceLabel(String(entityId ?? v))}`,
  'validation.comprehension_rate': (v) => `Approximately ${v}% understood the intended value`,
  'validation.comprehension_positive': (v) => `${v} tester(s) understood the intended value proposition`,
  'validation.comprehension_negative': (v) => `${v} tester(s) interpreted it as a generic productivity dashboard`,
  'product.positioning_weak': () => 'Positioning or messaging clarity remains weak',
  'validation.has_occurred': () => 'User validation has occurred',
}

function findBeliefByPredicate(beliefs: Belief[], predicate: string): Belief | undefined {
  return beliefs.find(b => b.reality?.predicate === predicate && !b.reality?.supersededAt)
}

function findAbsenceInference(beliefs: Belief[]): Belief | undefined {
  return beliefs.find(b =>
    b.id === REALITY_BELIEF_IDS.absenceInference
    || (b.reality?.predicate === 'validation.absence_inference' && !b.reality?.supersededAt)
    || (/no stored validation/i.test(b.statement) && b.source === 'system_inference' && !b.reality?.supersededAt),
  )
}

export function ensureSeedBeliefs(beliefs: Belief[]): Belief[] {
  let next = [...beliefs]
  if (!findAbsenceInference(next)) {
    const seed = createBelief(
      'No stored validation signals confirm real-user testing',
      'validation',
      'system_inference',
      42,
      'high',
    )
    seed.id = REALITY_BELIEF_IDS.absenceInference
    seed.reality = {
      predicate: 'validation.absence_inference',
      normalizedValue: 'absent',
      sourceClassification: 'inferred',
    }
    next.push(seed)
  }
  return next
}

function confidenceFromClaim(claim: RealityClaim, detailScore: number): number {
  const base = Math.round(claim.confidence * 100)
  const detailBoost = Math.round(detailScore * 0.6)
  return clampConfidence(base + detailBoost)
}

function sourceClassForClaim(source: RealitySourceClass): RealitySourceClass {
  return source === 'user_reported' ? 'user_reported' : source
}

function upsertRealityBelief(
  beliefs: Belief[],
  predicate: string,
  claim: RealityClaim,
  detailScore: number,
  evidenceId: string,
): { beliefs: Belief[]; change?: RealityChange } {
  const domain = domainForPredicate(predicate)
  const statementFn = PREDICATE_STATEMENTS[predicate]
  const statement = statementFn
    ? statementFn(claim.value, claim.entityId)
    : `${predicate}: ${String(claim.value)}`
  const confidence = confidenceFromClaim(claim, detailScore)
  const existing = findBeliefByPredicate(beliefs, predicate)
  const evidence = createEvidence(
    'user_statement',
    `User report: ${predicate}`,
    truncateText(claim.rawText, 120),
    claim.value !== false,
    claim.confidence,
    evidenceId,
  )

  if (!existing) {
    const belief = createBelief(statement, domain, 'user_statement', confidence, 'high')
    belief.reality = {
      predicate,
      entityId: claim.entityId,
      normalizedValue: String(claim.value),
      sourceClassification: sourceClassForClaim(claim.source),
    }
    if (predicate === 'validation.users_tested') belief.id = REALITY_BELIEF_IDS.usersTested
    if (predicate === 'validation.tester_count') belief.id = REALITY_BELIEF_IDS.testerCount
    if (predicate === 'validation.tested_surface') belief.id = REALITY_BELIEF_IDS.testedSurface
    if (predicate === 'validation.comprehension_rate') belief.id = REALITY_BELIEF_IDS.comprehensionRate
    if (predicate === 'product.positioning_weak') belief.id = REALITY_BELIEF_IDS.positioningWeak

    const withEvidence = updateBelief(belief, {
      evidence,
      reason: `New user evidence for ${predicate}`,
      triggerEvent: 'RealityEvidenceReceived',
    })

    return {
      beliefs: [...beliefs, withEvidence.belief],
      change: {
        id: newCognitiveId('rch'),
        beliefId: withEvidence.belief.id,
        previousStatement: '(none)',
        newStatement: withEvidence.belief.statement,
        previousConfidence: 0,
        newConfidence: withEvidence.belief.confidence,
        previousStatus: 'unknown',
        newStatus: withEvidence.belief.status,
        evidenceIds: [evidence.id],
        reason: `Created from user report: ${predicate}`,
        timestamp: nowISO(),
        domain,
      },
    }
  }

  const prev = existing
  const contradicts = existing.reality?.normalizedValue !== undefined
    && String(claim.value) !== existing.reality.normalizedValue
    && predicate === 'validation.users_tested'

  const result = contradicts
    ? updateBelief(existing, {
      statement,
      confidence: clampConfidence(existing.confidence - 28),
      evidence: { ...evidence, supports: false },
      reason: `Contradicting user report for ${predicate}`,
      triggerEvent: 'RealityContradictionDetected',
    })
    : updateBelief(existing, {
      statement,
      confidence: clampConfidence(Math.max(existing.confidence, confidence)),
      evidence,
      reason: `Updated from user report: ${predicate}`,
      triggerEvent: 'RealityEvidenceReceived',
    })
  const updated: Belief = {
    ...result.belief,
    status: contradicts ? 'contradicted' : result.belief.status,
    confidence: contradicts ? clampConfidence(prev.confidence - 28) : result.belief.confidence,
    reality: {
      ...existing.reality,
      predicate,
      entityId: claim.entityId ?? existing.reality?.entityId,
      normalizedValue: String(claim.value),
      sourceClassification: contradicts ? 'contradicted' : sourceClassForClaim(claim.source),
    },
  }

  const change: RealityChange = {
    id: newCognitiveId('rch'),
    beliefId: updated.id,
    previousStatement: prev.statement,
    newStatement: updated.statement,
    previousConfidence: prev.confidence,
    newConfidence: updated.confidence,
    previousStatus: prev.status,
    newStatus: updated.status,
    evidenceIds: [evidence.id],
    reason: `Updated from user report: ${predicate}`,
    timestamp: nowISO(),
    domain,
  }

  return {
    beliefs: beliefs.map(b => (b.id === updated.id ? updated : b)),
    change,
  }
}

export function supersedeAbsenceInference(
  beliefs: Belief[],
  reason: string,
): { beliefs: Belief[]; change?: RealityChange } {
  const absence = findAbsenceInference(beliefs)
  if (!absence || absence.reality?.supersededAt) return { beliefs }

  const historical = createEvidence(
    'system_inference',
    'Historical absence-of-storage inference',
    'Prior inference before user-reported testing — no longer current truth',
    false,
    0.15,
    'historical-absence',
  )

  const result = updateBelief(absence, {
    statement: 'Previously: no stored validation signals (superseded by user report)',
    confidence: 12,
    evidence: historical,
    reason,
    triggerEvent: 'RealityBeliefUpdated',
  })

  const updated: Belief = {
    ...result.belief,
    status: 'possible',
    reality: {
      ...absence.reality,
      predicate: 'validation.absence_inference',
      sourceClassification: 'superseded',
      supersededAt: nowISO(),
    },
  }

  return {
    beliefs: beliefs.map(b => (b.id === updated.id ? updated : b)),
    change: {
      id: newCognitiveId('rch'),
      beliefId: updated.id,
      previousStatement: absence.statement,
      newStatement: updated.statement,
      previousConfidence: absence.confidence,
      newConfidence: updated.confidence,
      previousStatus: absence.status,
      newStatus: updated.status,
      evidenceIds: [historical.id],
      reason: 'Superseded by direct user-reported testing evidence',
      timestamp: nowISO(),
      domain: 'validation',
    },
  }
}

export function reconcileClaimsToBeliefs(
  beliefs: Belief[],
  claims: RealityClaim[],
  userMessage: string,
): { beliefs: Belief[]; changes: RealityChange[]; contradictions: BeliefContradiction[] } {
  let next = ensureSeedBeliefs(beliefs)
  const changes: RealityChange[] = []
  const detailScore = messageDetailScore(userMessage)

  const hasUserTesting = claims.some(c =>
    (c.predicate === 'validation.users_tested' && c.value === true)
    || c.predicate === 'validation.tester_count'
    || c.predicate === 'validation.has_occurred',
  )

  if (hasUserTesting) {
    const supersede = supersedeAbsenceInference(next, 'User reported real-user testing')
    next = supersede.beliefs
    if (supersede.change) changes.push(supersede.change)
  }

  for (const claim of claims) {
    const evidenceId = `ev-claim-${claim.id}`
    const result = upsertRealityBelief(next, claim.predicate, claim, detailScore, evidenceId)
    next = result.beliefs
    if (result.change) changes.push(result.change)
  }

  const usersTested = findBeliefByPredicate(next, 'validation.users_tested')
  if (usersTested && hasUserTesting) {
    const surfaceClaim = claims.find(c => c.predicate === 'validation.tested_surface')
    const countClaim = claims.find(c => c.predicate === 'validation.tester_count')
    let stmt = 'Real users have tested FounderOS — user reported'
    if (surfaceClaim) stmt = `Real users have tested the ${surfaceLabel(String(surfaceClaim.value))} — user reported`
    if (countClaim) stmt += `, ${countClaim.value} tester(s)`
    stmt += ', details partially confirmed'

    const result = updateBelief(usersTested, {
      statement: stmt,
      confidence: clampConfidence(Math.min(82, usersTested.confidence + Math.min(12, detailScore / 4))),
      reason: 'Consolidated user-reported validation evidence',
      triggerEvent: 'RealityBeliefUpdated',
    })
    next = next.map(b => (b.id === usersTested.id ? {
      ...result.belief,
      reality: usersTested.reality,
    } : b))
  }

  const contradictions = detectContradictions(next)
  const explicitContradictions = changes
    .filter(c => c.newStatus === 'contradicted')
    .map(c => ({
      id: newCognitiveId('contra'),
      beliefAId: c.beliefId,
      beliefBId: c.beliefId,
      description: `Conflicting reports: ${c.previousStatement} vs ${c.newStatement}`,
      detectedAt: nowISO(),
      resolved: false,
    }))
  return { beliefs: next, changes, contradictions: [...contradictions, ...explicitContradictions] }
}

export function buildHypothesesFromClaims(claims: RealityClaim[], existing: Hypothesis[]): Hypothesis[] {
  const next = [...existing]
  const positioning = claims.find(c => c.predicate === 'product.positioning_weak' && c.value === true)
  if (positioning) {
    const stmt = 'Users may be categorizing FounderOS as a productivity dashboard instead of a decision system'
    if (!next.some(h => h.statement === stmt)) {
      next.push({
        id: newCognitiveId('hyp'),
        statement: stmt,
        topic: 'product',
        confidence: 58,
        status: 'open',
        evidenceFor: [],
        evidenceAgainst: [],
        createdAt: nowISO(),
        updatedAt: nowISO(),
      })
    }
  }
  return next.slice(-12)
}

export function buildUnknownsFromClaims(claims: RealityClaim[], existing: Unknown[]): Unknown[] {
  let next = [...existing]
  const hasTesting = claims.some(c => c.predicate === 'validation.users_tested' && c.value === true)
  const positioning = claims.some(c => c.predicate === 'product.positioning_weak')

  if (hasTesting && positioning) {
    const stmt = 'What exact words or first screen caused the productivity-dashboard interpretation'
    if (!next.some(u => u.statement.includes('exact words'))) {
      next.push({
        id: newCognitiveId('unk'),
        statement: stmt,
        topic: 'product',
        importance: 'high',
        relatedBeliefIds: [REALITY_BELIEF_IDS.positioningWeak],
        createdAt: nowISO(),
      })
    }
    next = next.filter(u => u.statement !== 'Whether real users have tested the product recently')
  }

  return next.slice(-20)
}

export function toRealityBelief(belief: Belief): RealityBelief {
  return {
    ...belief,
    domain: belief.topic,
    entityId: belief.reality?.entityId,
    predicate: belief.reality?.predicate ?? belief.statement.slice(0, 40),
    normalizedValue: belief.reality?.normalizedValue ?? String(belief.confidence),
    sourceClassification: (belief.reality?.sourceClassification ?? 'inferred') as RealitySourceClass,
    staleAt: belief.reality?.staleAt,
    supersededAt: belief.reality?.supersededAt,
  }
}

export function toRealityUnknown(unknown: Unknown): RealityUnknown {
  const valueScore = unknown.importance === 'critical' ? 95
    : unknown.importance === 'high' ? 80
      : unknown.importance === 'medium' ? 55 : 30
  return { ...unknown, domain: unknown.topic, valueScore }
}

export function toRealityHypothesis(hypothesis: Hypothesis): RealityHypothesis {
  return { ...hypothesis, domain: hypothesis.topic }
}

export function computeValidationScoreFromBeliefs(beliefs: Belief[]): number {
  const usersTested = findBeliefByPredicate(beliefs, 'validation.users_tested')
  const count = findBeliefByPredicate(beliefs, 'validation.tester_count')
  const rate = findBeliefByPredicate(beliefs, 'validation.comprehension_rate')
  let score = 22
  if (usersTested?.reality?.sourceClassification === 'user_reported' && usersTested.confidence >= 50) {
    score = 48
  }
  if (count) score += Math.min(18, Number(count.reality?.normalizedValue ?? 0) * 2)
  if (rate) score += Math.min(15, Number(rate.reality?.normalizedValue ?? 0) * 0.15)
  return clampConfidence(score)
}

export function computePositioningRisk(beliefs: Belief[]): number {
  const weak = findBeliefByPredicate(beliefs, 'product.positioning_weak')
  if (!weak) return 35
  return clampConfidence(weak.confidence)
}
