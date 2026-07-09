import type { DomainCoordinatorOutput, DomainEvaluation, DomainId } from './domainTypes'
import { DOMAIN_REGISTRY } from './domainRegistry'
import { DOMAIN_STATUS_COLORS } from './domainUtils'

export function formatDomainStatusLabel(status: DomainEvaluation['status']): string {
  return status.replace('_', ' ')
}

export function formatDomainList(evaluations: DomainEvaluation[]): string {
  return evaluations
    .map(e => `• **${e.domainName}** — ${formatDomainStatusLabel(e.status)} (${e.score}) · ${e.recommendation}`)
    .join('\n')
}

export function formatDomainSnapshotSummary(coordinator: DomainCoordinatorOutput): string {
  const lines = [
    `**Top domain:** ${coordinator.topDomainName}`,
    coordinator.globalRecommendation,
    '',
    '**Domain status:**',
    ...coordinator.evaluations.map(e =>
      `• ${e.domainName}: ${formatDomainStatusLabel(e.status)} (${e.score}) — ${e.recommendation}`,
    ),
  ]
  if (coordinator.neglectedDomains.length > 0) {
    lines.push('', `**Neglected:** ${coordinator.neglectedDomains.map(id => DOMAIN_REGISTRY[id].name).join(', ')}`)
  }
  if (coordinator.tradeoffs.length > 0) {
    lines.push('', `**Tradeoffs:** ${coordinator.tradeoffs.join(' ')}`)
  }
  return lines.join('\n')
}

export function formatSingleDomainResponse(evaluation: DomainEvaluation | undefined, domainName: string): string {
  if (!evaluation) {
    return `No evaluation data for **${domainName}** yet. Add signals, objects, or complete daily reviews.`
  }
  const lines = [
    `**${evaluation.domainName}** — ${formatDomainStatusLabel(evaluation.status)} (score ${evaluation.score}, ${evaluation.priority} priority)`,
    evaluation.recommendation,
    evaluation.nextAction ? `**Next action:** ${evaluation.nextAction}` : null,
    evaluation.risks.length ? `**Risks:** ${evaluation.risks.join(' · ')}` : null,
    evaluation.opportunities.length ? `**Opportunities:** ${evaluation.opportunities.join(' · ')}` : null,
    evaluation.evidence.length ? `**Evidence:** ${evaluation.evidence.slice(0, 3).map(e => e.title).join(', ')}` : null,
  ].filter(Boolean)
  return lines.join('\n\n')
}

export function formatDomainTradeoffResponse(
  coordinator: DomainCoordinatorOutput | null | undefined,
  domainA: DomainId,
  domainB: DomainId,
): string {
  if (!coordinator) return 'Domain intelligence not available yet. Open **/morning** to generate today\'s evaluations.'
  const a = coordinator.evaluations.find(e => e.domainId === domainA)
  const b = coordinator.evaluations.find(e => e.domainId === domainB)
  if (!a || !b) return 'Not enough domain data for this tradeoff.'

  const relevantTradeoff = coordinator.tradeoffs.find(t =>
    t.toLowerCase().includes(DOMAIN_REGISTRY[domainA].name.toLowerCase())
    || t.toLowerCase().includes(DOMAIN_REGISTRY[domainB].name.toLowerCase()),
  )

  return [
    `**${a.domainName}** (${a.status}, score ${a.score}): ${a.recommendation}`,
    `**${b.domainName}** (${b.status}, score ${b.score}): ${b.recommendation}`,
    '',
    `**Coordinator says:** ${coordinator.globalRecommendation}`,
    relevantTradeoff ? `**Tradeoff:** ${relevantTradeoff}` : null,
  ].filter(Boolean).join('\n\n')
}

export function getDecisionInfluenceLabel(coordinator: DomainCoordinatorOutput | null): string {
  if (!coordinator) return ''
  const top = coordinator.evaluations.find(e => e.domainId === coordinator.topDomain)
  if (!top) return ''
  const atRisk = coordinator.evaluations.filter(e => e.status === 'at_risk' || e.priority === 'critical')
  if (atRisk.length > 0 && atRisk[0].domainId !== coordinator.topDomain) {
    return `This decision is influenced by ${atRisk[0].domainName} being ${atRisk[0].status.replace('_', ' ')} and ${top.domainName} momentum.`
  }
  return `This decision is influenced by ${top.domainName} being ${top.status.replace('_', ' ')} today.`
}

export function statusColorClass(status: DomainEvaluation['status']): string {
  return DOMAIN_STATUS_COLORS[status]
}

export function findDomainEvaluation(
  evaluations: DomainEvaluation[] | undefined,
  domainId: DomainId,
): DomainEvaluation | undefined {
  return evaluations?.find(e => e.domainId === domainId)
}
