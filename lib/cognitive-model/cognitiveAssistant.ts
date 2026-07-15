import type { CognitiveStore } from './beliefTypes'
import {
  activeHypothesisSummary,
  buildCognitiveInsight,
  confidenceBoosters,
  explainBelief,
  mindChanged,
  summarizeBeliefs,
  whatChangedSince,
  whatUncertain,
} from './cognitiveSummary'
import { topBelief } from './worldModel'
import {
  explainBelief as explainRealityBelief,
  getCurrentBelief,
  getHighestValueUnknown,
  getRealitySummary,
} from './realityQueries'

export function answerCognitiveQuery(store: CognitiveStore, prompt: string): string | null {
  const lower = prompt.toLowerCase()
  const world = store.worldModel
  const snapshot = world.realitySnapshot

  if (matches(lower, ['what do you currently believe', 'what do you believe', 'current beliefs'])) {
    if (snapshot) {
      const lines = snapshot.activeBeliefs.slice(0, 6).map(b =>
        `• ${b.statement} (${b.confidence}%, ${b.sourceClassification})`,
      )
      return `What FounderOS currently understands:\n${lines.join('\n')}`
    }
    return summarizeBeliefs(world)
  }
  if (matches(lower, ['why did that change', 'why this changed', 'why did you change'])) {
    const change = snapshot?.highestImpactChanges[0]
    if (change) return `Why this changed: ${change.reason}`
    const b = topBelief(world)
    return b ? explainBelief(b) : "I don't have a strong belief to explain yet."
  }
  if (matches(lower, ['why do you think', 'why do you believe', 'why that'])) {
    const b = topBelief(world)
    return b ? explainBelief(b) : "I don't have a strong belief to explain yet."
  }
  if (matches(lower, ['what changed since yesterday', 'what changed', 'changed since'])) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    return whatChangedSince(store, since)
  }
  if (matches(lower, ['what evidence supports', 'what evidence do you have', 'evidence do you have'])) {
    const b = topBelief(world)
    return b ? explainBelief(b) : 'No top belief with evidence yet.'
  }
  if (matches(lower, ['what are you uncertain', 'uncertain about', 'what don\'t you know', 'still uncertain'])) {
    if (snapshot?.biggestUnknowns.length) {
      return `Still uncertain:\n${snapshot.biggestUnknowns.slice(0, 5).map(u => `• ${u.statement}`).join('\n')}`
    }
    return whatUncertain(world)
  }
  if (matches(lower, ['have real users tested', 'users tested this', 'anyone tested'])) {
    const belief = snapshot
      ? getCurrentBelief(snapshot, 'founderos', 'validation.users_tested')
      : null
    if (belief) return `${belief.statement} — ${belief.confidence}% confidence (${belief.sourceClassification}).`
    return 'I do not have confirmed evidence of real-user testing yet.'
  }
  if (matches(lower, ['current bottleneck', 'what is the bottleneck'])) {
    return world.currentBottlenecks[0]
      ? `Current bottleneck: ${world.currentBottlenecks[0]}`
      : 'No single bottleneck is dominant yet.'
  }
  if (matches(lower, ['what should i validate next', 'validate next', 'what to validate'])) {
    const unknown = snapshot ? getHighestValueUnknown(snapshot) : null
    return unknown?.statement ?? 'Run a small first-impression test on your strongest surface.'
  }
  if (matches(lower, ['what hypothesis', 'testing a hypothesis', 'currently testing'])) {
    return activeHypothesisSummary(world)
  }
  if (matches(lower, ['changed your mind', 'have you changed'])) {
    return mindChanged(world)
  }
  if (matches(lower, ['increase your confidence', 'increase my confidence', 'what information would'])) {
    return confidenceBoosters(world)
  }
  if (matches(lower, ['biggest unknown', 'top unknown'])) {
    const insight = buildCognitiveInsight(world)
    return `Biggest unknown: ${insight.biggestUnknown}`
  }
  if (matches(lower, ['highest risk', 'top risk'])) {
    const insight = buildCognitiveInsight(world)
    return `Highest risk: ${insight.highestRisk}`
  }
  if (matches(lower, ['question you most want', 'most want answered', 'top question'])) {
    const insight = buildCognitiveInsight(world)
    return insight.topQuestion
  }
  if (matches(lower, ['reality summary', 'current summary'])) {
    return snapshot ? getRealitySummary(snapshot) : summarizeBeliefs(world)
  }

  const top = topBelief(world)
  if (top && matches(lower, ['explain belief', 'why this belief'])) {
    return explainRealityBelief(store, top.id)
  }

  return null
}

function matches(lower: string, phrases: string[]): boolean {
  return phrases.some((p) => lower.includes(p))
}
