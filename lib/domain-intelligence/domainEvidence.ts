import type { DomainDefinition, DomainEvidence, DomainEvaluationInput, DomainId } from './domainTypes'
import { DOMAIN_REGISTRY } from './domainRegistry'
import {
  knowledgeMatchesDomain,
  knowledgeText,
  memoryMatchesDomain,
  memoryText,
  objectMatchesDomain,
  objectText,
  signalMatchesDomain,
  signalText,
  textIncludesAny,
} from './domainUtils'

export interface FilteredDomainData {
  objects: ReturnType<typeof filterObjectsForDomain>
  memories: ReturnType<typeof filterMemoriesForDomain>
  knowledge: ReturnType<typeof filterKnowledgeForDomain>
  signals: ReturnType<typeof filterSignalsForDomain>
  outcomes: ReturnType<typeof filterOutcomesForDomain>
  planItems: NonNullable<DomainEvaluationInput['morningPlan']>['topPriorities']
}

export function filterObjectsForDomain(input: DomainEvaluationInput, domainId: DomainId) {
  return input.objects.filter(o => objectMatchesDomain(o, domainId))
}

export function filterMemoriesForDomain(input: DomainEvaluationInput, domainId: DomainId) {
  return input.memories.filter(m => memoryMatchesDomain(m, domainId))
}

export function filterKnowledgeForDomain(input: DomainEvaluationInput, domainId: DomainId) {
  return input.knowledge.filter(k => knowledgeMatchesDomain(k, domainId))
}

export function filterSignalsForDomain(input: DomainEvaluationInput, domainId: DomainId) {
  return input.signals.filter(s => signalMatchesDomain(s, domainId))
}

export function filterOutcomesForDomain(input: DomainEvaluationInput, domainId: DomainId) {
  return input.outcomes.filter(entry => {
    const text = `${entry.prediction.decisionTitle} ${entry.prediction.predictedAction} ${entry.prediction.decisionArea ?? ''}`
    return textIncludesAny(text, getDomainKeywords(domainId))
  })
}

function getDomainKeywords(domainId: DomainId): string[] {
  return DOMAIN_REGISTRY[domainId].keywords
}

export function filterPlanItemsForDomain(input: DomainEvaluationInput, domainId: DomainId) {
  const items = input.morningPlan?.topPriorities ?? []
  return items.filter(item => {
    const text = `${item.title} ${item.reason ?? ''} ${item.area ?? ''}`
    return textIncludesAny(text, getDomainKeywords(domainId))
      || (domainId === 'school' && item.area === 'knowledge')
      || (domainId === 'health' && item.area === 'health')
      || (domainId === 'founder' && textIncludesAny(text, ['founderos', 'ascendos']))
      || (domainId === 'personal_growth' && item.area === 'growth')
      || (domainId === 'finance' && item.area === 'career')
      || (domainId === 'systems' && (item.area === 'systems' || textIncludesAny(text, ['inbox', 'capture', 'review'])))
  })
}

export function gatherDomainData(input: DomainEvaluationInput, domainId: DomainId): FilteredDomainData {
  return {
    objects: filterObjectsForDomain(input, domainId),
    memories: filterMemoriesForDomain(input, domainId),
    knowledge: filterKnowledgeForDomain(input, domainId),
    signals: filterSignalsForDomain(input, domainId),
    outcomes: filterOutcomesForDomain(input, domainId),
    planItems: filterPlanItemsForDomain(input, domainId),
  }
}

export function buildDomainEvidence(
  def: DomainDefinition,
  data: FilteredDomainData,
  input: DomainEvaluationInput,
): DomainEvidence[] {
  const evidence: DomainEvidence[] = []

  for (const obj of data.objects.slice(0, 4)) {
    evidence.push({
      sourceType: 'object',
      sourceId: obj.id,
      title: obj.title,
      summary: obj.summary || obj.content?.slice(0, 120) || `${obj.type} in ${def.name}`,
      weight: obj.priority === 'high' ? 8 : 5,
      supports: obj.status !== 'archived',
      conflicts: false,
    })
  }

  for (const mem of data.memories.slice(0, 3)) {
    evidence.push({
      sourceType: 'memory',
      sourceId: mem.id,
      title: mem.title,
      summary: mem.summary || mem.content.slice(0, 120),
      weight: mem.importance === 'high' || mem.importance === 'critical' ? 7 : 4,
      supports: mem.type !== 'health_log' || mem.content.includes('completed'),
      conflicts: mem.type === 'health_log' && mem.content.toLowerCase().includes('missed'),
    })
  }

  for (const k of data.knowledge.slice(0, 2)) {
    evidence.push({
      sourceType: 'knowledge',
      sourceId: k.id,
      title: k.title,
      summary: k.principle.slice(0, 120),
      weight: k.confidence === 'high' ? 6 : 4,
      supports: true,
      conflicts: false,
    })
  }

  for (const sig of data.signals.slice(0, 4)) {
    const isRisk = sig.content.toLowerCase().includes('not logged')
      || sig.content.toLowerCase().includes('overdue')
      || sig.content.toLowerCase().includes('missed')
    evidence.push({
      sourceType: 'signal',
      sourceId: sig.id,
      title: sig.title,
      summary: sig.content.slice(0, 120),
      weight: sig.source === 'calendar' ? 8 : 5,
      supports: !isRisk,
      conflicts: isRisk,
    })
  }

  for (const item of data.planItems.filter(p => !p.completed).slice(0, 2)) {
    evidence.push({
      sourceType: 'morning',
      sourceId: item.id,
      title: item.title,
      summary: item.reason || 'Morning priority',
      weight: item.priority === 'high' ? 7 : 5,
      supports: false,
      conflicts: false,
    })
  }

  if (input.eveningReview && !input.eveningReview.completed) {
    evidence.push({
      sourceType: 'evening',
      sourceId: input.eveningReview.id,
      title: 'Evening review pending',
      summary: 'Yesterday loop not fully closed.',
      weight: 4,
      supports: false,
      conflicts: def.id === 'systems',
    })
  }

  for (const outcome of data.outcomes.filter(o => o.record).slice(0, 2)) {
    const good = outcome.record!.outcomeQuality === 'good' || outcome.record!.outcomeQuality === 'excellent'
    evidence.push({
      sourceType: 'outcome',
      sourceId: outcome.prediction.id,
      title: outcome.prediction.decisionTitle,
      summary: `Followed: ${outcome.record!.completed}, quality: ${outcome.record!.outcomeQuality}`,
      weight: 7,
      supports: good,
      conflicts: outcome.record!.outcomeQuality === 'poor',
    })
  }

  if (input.decisionOutput && def.id === decisionDomainHint(input.decisionOutput.primaryDecision.area, input.decisionOutput.primaryDecision.title)) {
    evidence.push({
      sourceType: 'decision',
      sourceId: input.decisionOutput.id,
      title: input.decisionOutput.primaryDecision.title,
      summary: input.decisionOutput.primaryDecision.action,
      weight: 9,
      supports: true,
      conflicts: false,
    })
  }

  return evidence.slice(0, 10)
}

function decisionDomainHint(area: string, title: string): DomainId | null {
  const text = title.toLowerCase()
  if (textIncludesAny(text, ['study', 'exam', 'school'])) return 'school'
  if (textIncludesAny(text, ['founderos', 'ascendos', 'coding'])) return 'founder'
  if (textIncludesAny(text, ['workout', 'gym', 'recover', 'sleep'])) return 'health'
  if (textIncludesAny(text, ['inbox', 'capture'])) return 'systems'
  if (area === 'knowledge') return 'school'
  if (area === 'health' || area === 'recovery') return 'health'
  if (area === 'growth') return 'personal_growth'
  if (area === 'career') return 'finance'
  if (area === 'systems') return textIncludesAny(text, ['founderos', 'ascendos']) ? 'founder' : 'systems'
  return null
}
