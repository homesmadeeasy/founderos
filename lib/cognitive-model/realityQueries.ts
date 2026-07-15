import type { RealityChange, RealitySnapshot } from './realityTypes'
import type { Belief, BeliefTopic, CognitiveStore } from './beliefTypes'
import { toRealityBelief } from './beliefReconciliation'

export function getCurrentBelief(
  snapshot: RealitySnapshot,
  subject: string,
  predicate: string,
): import('./realityTypes').RealityBelief | null {
  const match = snapshot.activeBeliefs.find(b =>
    b.reality?.predicate === predicate
    || b.predicate === predicate
    || (b.entityId === subject && b.predicate === predicate),
  )
  return match ?? null
}

export function getBeliefHistory(store: CognitiveStore, beliefId: string): Belief['history'] {
  const belief = store.worldModel.beliefs.find(b => b.id === beliefId)
  return belief?.history ?? []
}

export function getWhatChangedSince(store: CognitiveStore, timestamp: string): RealityChange[] {
  const changes = store.worldModel.realitySnapshot?.highestImpactChanges ?? []
  return changes.filter(c => c.timestamp > timestamp)
}

export function getHighestValueUnknown(
  snapshot: RealitySnapshot,
  domain?: BeliefTopic,
): import('./realityTypes').RealityUnknown {
  const unknowns = domain
    ? snapshot.biggestUnknowns.filter(u => u.domain === domain)
    : snapshot.biggestUnknowns
  return unknowns[0] ?? {
    id: 'unk-default',
    statement: 'What should be validated next',
    topic: 'validation',
    domain: 'validation',
    importance: 'high',
    relatedBeliefIds: [],
    createdAt: new Date().toISOString(),
    valueScore: 70,
  }
}

export function getContradictions(
  snapshot: RealitySnapshot,
  domain?: BeliefTopic,
): RealitySnapshot['contradictions'] {
  if (!domain) return snapshot.contradictions
  const beliefIds = new Set(
    snapshot.activeBeliefs.filter(b => b.domain === domain).map(b => b.id),
  )
  return snapshot.contradictions.filter(c =>
    beliefIds.has(c.beliefAId) || beliefIds.has(c.beliefBId),
  )
}

export function getRealitySummary(snapshot: RealitySnapshot, domain?: BeliefTopic): string {
  const summaries = domain
    ? snapshot.domainSummaries.filter(s => s.domain === domain)
    : snapshot.domainSummaries
  if (!summaries.length) return 'Reality model is still forming.'
  return summaries.map(s => `${s.headline} (${s.confidence}% confidence)`).join('. ')
}

export function explainBelief(store: CognitiveStore, beliefId: string): string {
  const belief = store.worldModel.beliefs.find(b => b.id === beliefId)
  if (!belief) return 'Belief not found.'
  const rb = toRealityBelief(belief)
  const support = belief.supportingEvidence.slice(0, 2).map(e => e.title).join(', ')
  const parts = [
    `${rb.statement} (${rb.confidence}% confidence, ${rb.sourceClassification})`,
  ]
  if (support) parts.push(`Evidence: ${support}`)
  const last = belief.history[belief.history.length - 1]
  if (last) parts.push(`Why it changed: ${last.reason}`)
  return parts.join('\n')
}

export function selectNextRealityQuestion(snapshot: RealitySnapshot): { text: string; purpose: string } {
  const positioning = snapshot.activeBeliefs.find(b => b.predicate === 'product.positioning_weak')
  const hasTesting = snapshot.activeBeliefs.some(b =>
    b.predicate === 'validation.users_tested' && b.normalizedValue === 'true',
  )
  const surface = snapshot.activeBeliefs.find(b => b.predicate === 'validation.tested_surface')

  if (hasTesting && positioning && positioning.confidence >= 50) {
    return {
      text: 'What exact words or screen did you show them first?',
      purpose: 'Clarify positioning — understand first-impression framing',
    }
  }
  if (hasTesting && !surface) {
    return {
      text: 'Which part of FounderOS did they test?',
      purpose: 'Confirm tested surface',
    }
  }
  if (hasTesting) {
    return {
      text: 'What did they say when they misunderstood it?',
      purpose: 'Collect positioning reactions',
    }
  }

  const topUnknown = getHighestValueUnknown(snapshot)
  return {
    text: topUnknown.statement.endsWith('?') ? topUnknown.statement : `${topUnknown.statement}?`,
    purpose: 'Reduce highest-value uncertainty',
  }
}

export function formatRealityChangeIndicators(changes: RealityChange[]): string[] {
  return changes.map(c => {
    const shortPrev = c.previousStatement.replace(/^Previously: /, '').slice(0, 40)
    const shortNew = c.newStatement.slice(0, 50)
    if (/absence|no stored validation/i.test(c.previousStatement) && /user reported|tested/i.test(c.newStatement)) {
      return 'Validation: absent → user-reported testing'
    }
    if (/positioning/i.test(c.newStatement) || c.domain === 'product') {
      return 'Primary risk: no users → positioning clarity'
    }
    return `${shortPrev} → ${shortNew}`
  })
}
