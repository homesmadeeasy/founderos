import type { Belief, CognitiveInsight, CognitiveStore, WorldModel } from './beliefTypes'
import { normalizeWorldModel } from './cognitiveNormalize'
import { timelineSince, timelineSummary } from './beliefTimeline'
import { confidenceLabel, daysSince, epistemicPhrase } from './cognitiveUtils'
import { biggestUnknown, highestRisk, topBelief } from './worldModel'
import { selectHighestValueQuestion } from './beliefQuestions'
import { findActiveHypothesis } from './beliefHypotheses'
import { contradictionPhrase } from './beliefContradictions'

export function buildCognitiveInsight(world: WorldModel): CognitiveInsight {
  const model = normalizeWorldModel(world)
  const belief = topBelief(model)
  const unknown = biggestUnknown(model)
  const question = selectHighestValueQuestion(model)

  return {
    currentBelief: belief
      ? `${epistemicPhrase(belief.status, belief.confidence)} ${belief.statement}`
      : 'I am still forming my first beliefs about your company.',
    biggestUnknown: unknown
      ? unknown.statement
      : 'Most foundational unknowns are starting to resolve.',
    highestRisk: highestRisk(world),
    topQuestion: question?.text ?? 'What should we focus on together this week?',
  }
}

export function summarizeBeliefs(world: WorldModel): string {
  const model = normalizeWorldModel(world)
  if (model.beliefs.length === 0) return "I don't have established beliefs yet — I'm still gathering evidence."
  const lines = model.beliefs
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)
    .map((b) => `• ${epistemicPhrase(b.status, b.confidence)} ${b.statement} (${b.confidence}%)`)
  return `Here is what I currently believe about your company:\n${lines.join('\n')}`
}

export function explainBelief(belief: Belief): string {
  const support = belief.supportingEvidence.slice(0, 3).map((e) => `  + ${e.title}: ${e.summary}`)
  const contra = belief.contradictingEvidence.slice(0, 2).map((e) => `  − ${e.title}: ${e.summary}`)
  const parts = [
    `${epistemicPhrase(belief.status, belief.confidence)} ${belief.statement}`,
    `Confidence: ${belief.confidence}% (${confidenceLabel(belief.confidence)})`,
  ]
  if (support.length) parts.push(`Supporting evidence:\n${support.join('\n')}`)
  if (contra.length) parts.push(`Contradicting evidence:\n${contra.join('\n')}`)
  if (belief.history.length) {
    const last = belief.history[belief.history.length - 1]!
    parts.push(`Last change: ${last.reason}`)
  }
  return parts.join('\n\n')
}

export function whatChangedSince(store: CognitiveStore, sinceISO: string): string {
  const entries = timelineSince(store, sinceISO)
  const model = normalizeWorldModel(store.worldModel)
  const beliefChanges = model.beliefs.filter((b) =>
    b.history.some((h) => h.timestamp > sinceISO),
  )
  const parts: string[] = []
  if (beliefChanges.length) {
    parts.push('Belief changes:')
    for (const b of beliefChanges.slice(0, 5)) {
      const h = b.history.filter((x) => x.timestamp > sinceISO).pop()
      if (h) parts.push(`• ${b.statement}: ${h.reason}`)
    }
  }
  parts.push(timelineSummary(entries))
  return parts.join('\n') || 'No significant changes since then.'
}

export function whatUncertain(world: WorldModel): string {
  const model = normalizeWorldModel(world)
  const low = model.beliefs.filter((b) => b.confidence < 45 || b.status === 'unknown')
  const unknowns = model.unknowns
  const lines: string[] = ['Here is what I am uncertain about:']
  for (const u of unknowns.slice(0, 5)) lines.push(`• Unknown: ${u.statement}`)
  for (const b of low.slice(0, 5)) lines.push(`• Low confidence: ${b.statement} (${b.confidence}%)`)
  for (const c of model.contradictions.filter((x) => !x.resolved).slice(0, 2)) {
    lines.push(`• ${contradictionPhrase(c)}`)
  }
  return lines.join('\n')
}

export function activeHypothesisSummary(world: WorldModel): string {
  const model = normalizeWorldModel(world)
  const h = findActiveHypothesis(model.currentHypotheses)
  if (!h) return 'I am not actively testing a specific hypothesis right now.'
  return `I'm testing: "${h.statement}" (${h.confidence}% confidence, status: ${h.status}).`
}

export function mindChanged(world: WorldModel): string {
  const model = normalizeWorldModel(world)
  const recent = model.beliefs
    .flatMap((b) => b.history.map((h) => ({ belief: b, history: h })))
    .filter((x) => daysSince(x.history.timestamp) <= 2)
    .sort((a, b) => b.history.timestamp.localeCompare(a.history.timestamp))

  if (recent.length === 0) return "I haven't changed my mind on anything major in the last couple of days."
  const lines = recent.slice(0, 4).map((r) =>
    `I've changed my mind based on new evidence: "${r.belief.statement}" — ${r.history.reason}`,
  )
  return lines.join('\n')
}

export function confidenceBoosters(world: WorldModel): string {
  const model = normalizeWorldModel(world)
  const q = selectHighestValueQuestion(model)
  const unknown = biggestUnknown(model)
  const parts = ['Information that would increase my confidence:']
  if (q) parts.push(`• Answer: ${q.text}`)
  if (unknown) parts.push(`• Resolve: ${unknown.statement}`)
  for (const h of model.currentHypotheses.filter((x) => x.status === 'open').slice(0, 2)) {
    parts.push(`• Test hypothesis: ${h.statement}`)
  }
  return parts.join('\n')
}
