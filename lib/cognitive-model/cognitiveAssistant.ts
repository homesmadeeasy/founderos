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

export function answerCognitiveQuery(store: CognitiveStore, prompt: string): string | null {
  const lower = prompt.toLowerCase()
  const world = store.worldModel

  if (matches(lower, ['what do you currently believe', 'what do you believe', 'current beliefs'])) {
    return summarizeBeliefs(world)
  }
  if (matches(lower, ['why do you think', 'why do you believe', 'why that'])) {
    const b = topBelief(world)
    return b ? explainBelief(b) : "I don't have a strong belief to explain yet."
  }
  if (matches(lower, ['what changed since yesterday', 'what changed', 'changed since'])) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    return whatChangedSince(store, since)
  }
  if (matches(lower, ['what evidence supports', 'evidence supports'])) {
    const b = topBelief(world)
    return b ? explainBelief(b) : 'No top belief with evidence yet.'
  }
  if (matches(lower, ['what are you uncertain', 'uncertain about', 'what don\'t you know'])) {
    return whatUncertain(world)
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

  return null
}

function matches(lower: string, phrases: string[]): boolean {
  return phrases.some((p) => lower.includes(p))
}
