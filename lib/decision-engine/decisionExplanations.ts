import type { DecisionEvidence, DecisionOutput } from './decisionTypes'

export function buildExplanation(output: Omit<DecisionOutput, 'explanation'>): string {
  const { primaryDecision, evidence, ignoreToday, confidence } = output
  const topEvidence = evidence.filter(e => e.supports && !e.conflicts).slice(0, 2)
  const evidencePhrase = topEvidence.length > 0
    ? topEvidence.map(e => `${e.title} (${e.sourceType})`).join(' and ')
    : 'available context'

  const ignorePhrase = ignoreToday.length > 0
    ? ignoreToday[0].replace(/^Defer |^Ignore /i, '')
    : 'secondary priorities'

  return [
    `I recommend **${primaryDecision.action}** because ${primaryDecision.reason}`,
    `The strongest evidence is ${evidencePhrase}.`,
    `I would ignore ${ignorePhrase} today to protect focus.`,
    `Confidence: ${confidence}%.`,
  ].join(' ')
}
