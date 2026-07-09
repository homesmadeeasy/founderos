import type { FounderRisk, FounderBottleneck } from './founderTypes'
import type { FilteredFounderData } from './founderSignals'
import type { FounderScores } from './founderScoring'

export function detectFounderRisks(
  data: FilteredFounderData,
  scores: FounderScores,
  unprocessedCaptures = 0,
): FounderRisk[] {
  const risks: FounderRisk[] = []

  if (scores.architectureScore > 65 && scores.validationScore < 40) {
    risks.push({
      id: 'overengineering',
      title: 'Overengineering',
      severity: 'high',
      description: 'Strong infrastructure progress without enough proof that users care.',
    })
  }

  if (data.validationMemories.length === 0 && scores.productScore > 50) {
    risks.push({
      id: 'no-users',
      title: 'No real users yet',
      severity: 'high',
      description: 'Product surfaces exist but there is little evidence of external validation.',
    })
  }

  if (data.architectureMemories.length >= 4 && data.knowledge.filter(k => k.domain === 'systems').length >= 3) {
    risks.push({
      id: 'too-many-engines',
      title: 'Too many engines',
      severity: 'medium',
      description: 'The system is becoming powerful faster than it is becoming useful.',
    })
  }

  if (!data.memories.some(m => m.content.toLowerCase().includes('onboarding'))) {
    risks.push({
      id: 'weak-onboarding',
      title: 'Weak onboarding',
      severity: 'medium',
      description: 'No strong evidence that new users understand FounderOS quickly.',
    })
  }

  if (scores.uxScore < 45) {
    risks.push({
      id: 'ux-clarity',
      title: 'UX clarity',
      severity: 'medium',
      description: 'The product may be harder to understand than it feels from inside the build.',
    })
  }

  if (unprocessedCaptures > 4) {
    risks.push({
      id: 'capture-backlog',
      title: 'Capture backlog',
      severity: 'low',
      description: 'Unprocessed captures are creating noise instead of product signal.',
    })
  }

  if (scores.productScore > 60 && scores.validationScore < 30) {
    risks.push({
      id: 'too-broad',
      title: 'Too broad too early',
      severity: 'high',
      description: 'Breadth is outpacing depth — pick one wedge and prove it.',
    })
  }

  if (data.openAppTasks > 10) {
    risks.push({
      id: 'focus-drift',
      title: 'Product focus drift',
      severity: 'medium',
      description: 'Too many open tasks — founder energy is spreading thin.',
    })
  }

  return risks
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, 6)
}

function severityWeight(s: FounderRisk['severity']): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1
}

export function detectMainBottleneck(
  scores: FounderScores,
  data: FilteredFounderData,
  risks: FounderRisk[],
): FounderBottleneck {
  if (risks.some(r => r.id === 'overengineering')) return 'Overengineering'
  if (scores.validationScore < 40) return 'Validation'
  if (scores.uxScore < 45) return 'UX clarity'
  if (scores.validationScore < 55 && scores.productScore > 55) return 'Distribution'
  if (data.openAppTasks > 8 || data.activeTasks.length > 6) return 'Product focus'
  if (risks.some(r => r.id === 'weak-onboarding')) return 'User trust'
  if (scores.executionScore < 45) return 'Execution'
  return 'None'
}

export function buildIgnoreToday(
  bottleneck: FounderBottleneck,
  data: FilteredFounderData,
  decisionIgnore?: string[],
): string[] {
  const ignore: string[] = [...(decisionIgnore ?? [])]

  if (bottleneck === 'Overengineering' || bottleneck === 'Validation') {
    ignore.push('New engine architecture')
    ignore.push('More internal dashboards')
    ignore.push('Expanding domain coverage before one wedge is proven')
  }
  if (bottleneck === 'Product focus') {
    ignore.push('Starting new side projects')
    ignore.push('Broad refactors')
  }
  if (data.architectureMemories.length > 3) {
    ignore.push('Documentation-only milestones')
  }

  return [...new Set(ignore)].slice(0, 5)
}
