import type { DomainEvaluation, DomainEvaluationInput, DomainIntelligenceOutput } from './domainTypes'
import { DOMAIN_IDS, DOMAIN_REGISTRY } from './domainRegistry'
import { buildDomainEvidence, gatherDomainData } from './domainEvidence'
import { scoreDomain } from './domainScoring'
import { coordinateDomains } from './domainCoordinator'
import { clamp, newDomainId, nowISO, scoreToPriority, scoreToStatus } from './domainUtils'

export function evaluateDomain(
  domainId: typeof DOMAIN_IDS[number],
  input: DomainEvaluationInput,
): DomainEvaluation {
  const def = DOMAIN_REGISTRY[domainId]
  const data = gatherDomainData(input, domainId)
  const scored = scoreDomain(domainId, data, input)
  const evidence = buildDomainEvidence(def, data, input)

  const supportingEvidence = evidence.filter(e => e.supports).length
  const conflictingEvidence = evidence.filter(e => e.conflicts).length
  const confidence = clamp(
    (scored.hasData ? 40 : 15)
    + supportingEvidence * 5
    - conflictingEvidence * 4
    + (evidence.length > 0 ? 10 : 0),
    10,
    95,
  )

  return {
    id: newDomainId('eval'),
    domainId,
    domainName: def.name,
    createdAt: nowISO(),
    status: scoreToStatus(scored.score, scored.hasData || evidence.length > 0),
    score: scored.score,
    priority: scoreToPriority(scored.score, scored.hasUrgentSignals),
    recommendation: scored.recommendation,
    nextAction: scored.nextAction,
    risks: scored.risks,
    opportunities: scored.opportunities,
    evidence,
    confidence,
    relatedObjectIds: data.objects.map(o => o.id),
    relatedMemoryIds: data.memories.map(m => m.id),
    relatedKnowledgeIds: data.knowledge.map(k => k.id),
    relatedSignalIds: data.signals.map(s => s.id),
    relatedOutcomeIds: data.outcomes.map(o => o.prediction.id),
  }
}

export function evaluateAllDomains(input: DomainEvaluationInput): DomainEvaluation[] {
  return DOMAIN_IDS.map(domainId => evaluateDomain(domainId, input))
}

export function buildDomainIntelligence(input: DomainEvaluationInput): DomainIntelligenceOutput {
  const evaluations = evaluateAllDomains(input)
  const coordinator = coordinateDomains(evaluations)
  return { evaluations, coordinator }
}

export { coordinateDomains } from './domainCoordinator'
