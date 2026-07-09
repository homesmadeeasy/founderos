import type { DomainCoordinatorOutput, DomainEvaluation, DomainId } from './domainTypes'
import { DOMAIN_REGISTRY } from './domainRegistry'
import { clamp, nowISO } from './domainUtils'

const PRIORITY_WEIGHT: Record<DomainEvaluation['priority'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const STATUS_WEIGHT: Record<DomainEvaluation['status'], number> = {
  at_risk: 4,
  needs_attention: 3,
  unknown: 1,
  good: 1,
  excellent: 0,
}

function effectivePriorityScore(evaluation: DomainEvaluation): number {
  const def = DOMAIN_REGISTRY[evaluation.domainId]
  const urgency = (100 - evaluation.score) * 0.6
  const priorityBoost = PRIORITY_WEIGHT[evaluation.priority] * 12
  const statusBoost = STATUS_WEIGHT[evaluation.status] * 8
  return (urgency + priorityBoost + statusBoost) * def.priorityWeight
}

export function coordinateDomains(evaluations: DomainEvaluation[]): DomainCoordinatorOutput {
  const ranked = [...evaluations].sort(
    (a, b) => effectivePriorityScore(b) - effectivePriorityScore(a),
  )
  const top = ranked[0]
  const topDomain = top.domainId
  const topDomainName = top.domainName

  const neglectedDomains = evaluations
    .filter(e =>
      e.status === 'unknown'
      || (e.score < 55 && e.priority !== 'critical' && e.evidence.length <= 2),
    )
    .map(e => e.domainId)

  const school = evaluations.find(e => e.domainId === 'school')
  const founder = evaluations.find(e => e.domainId === 'founder')
  const health = evaluations.find(e => e.domainId === 'health')
  const systems = evaluations.find(e => e.domainId === 'systems')

  const conflictedDomains: DomainId[] = []
  const tradeoffs: string[] = []

  if (school && founder && school.priority === 'critical' && founder.score >= 60) {
    conflictedDomains.push('school', 'founder')
    tradeoffs.push('School deadlines compete with FounderOS momentum — protect school first, then build.')
  }
  if (health && (health.status === 'at_risk' || health.priority === 'critical')) {
    if (founder && founder.score >= 55) conflictedDomains.push('health', 'founder')
    if (school && school.priority === 'critical') conflictedDomains.push('health', 'school')
    tradeoffs.push('Health is under pressure — reduce cognitive and physical load before pushing other domains.')
  }
  if (systems && systems.priority === 'high' && founder && founder.score >= 65) {
    conflictedDomains.push('systems', 'founder')
    tradeoffs.push('Inbox/system hygiene vs build time — clear capture pile before deep work.')
  }

  const globalRecommendation = buildGlobalRecommendation(top, evaluations, conflictedDomains)
  const explanation = buildCoordinatorExplanation(top, evaluations, conflictedDomains, neglectedDomains)
  const confidence = clamp(
    Math.round(evaluations.reduce((s, e) => s + e.confidence, 0) / evaluations.length),
    20,
    90,
  )

  return {
    createdAt: nowISO(),
    evaluations,
    topDomain,
    topDomainName,
    neglectedDomains: [...new Set(neglectedDomains)],
    conflictedDomains: [...new Set(conflictedDomains)],
    globalRecommendation,
    tradeoffs,
    confidence,
    explanation,
  }
}

function buildGlobalRecommendation(
  top: DomainEvaluation,
  evaluations: DomainEvaluation[],
  conflicts: DomainId[],
): string {
  const school = evaluations.find(e => e.domainId === 'school')
  const health = evaluations.find(e => e.domainId === 'health')
  const founder = evaluations.find(e => e.domainId === 'founder')
  const systems = evaluations.find(e => e.domainId === 'systems')

  if (health && (health.status === 'at_risk' || health.priority === 'critical')) {
    return 'Reduce load and prioritise recovery — health comes before school or FounderOS today.'
  }
  if (school && school.priority === 'critical' && founder && founder.score >= 55) {
    return 'Protect school first, then schedule FounderOS deep work in remaining windows.'
  }
  if (systems && systems.priority === 'high' && (systems.risks.length > 0)) {
    return 'Clear inbox and close open loops before adding more ideas or projects.'
  }
  if (founder && top.domainId === 'founder' && (!school || school.priority !== 'critical') && (!health || health.status !== 'at_risk')) {
    return 'School and health are stable — deep work on FounderOS is the right move today.'
  }
  if (top.domainId === 'school') {
    return `School needs attention today: ${top.nextAction}`
  }
  return `${top.domainName} should lead today: ${top.recommendation}`
}

function buildCoordinatorExplanation(
  top: DomainEvaluation,
  evaluations: DomainEvaluation[],
  conflicts: DomainId[],
  neglected: DomainId[],
): string {
  const parts: string[] = [
    `${top.domainName} leads today (${top.status}, score ${top.score}).`,
    top.recommendation,
  ]
  const atRisk = evaluations.filter(e => e.status === 'at_risk' || e.priority === 'critical')
  if (atRisk.length > 1) {
    parts.push(`Also watch: ${atRisk.filter(e => e.domainId !== top.domainId).map(e => e.domainName).join(', ')}.`)
  }
  if (conflicts.length > 0) {
    const names = [...new Set(conflicts)].map(id => DOMAIN_REGISTRY[id].name)
    parts.push(`Active tradeoffs: ${names.join(' vs ')}.`)
  }
  if (neglected.length > 0) {
    parts.push(`Neglected: ${neglected.map(id => DOMAIN_REGISTRY[id].name).join(', ')}.`)
  }
  return parts.join(' ')
}
