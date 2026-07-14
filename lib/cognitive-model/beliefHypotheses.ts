import type { NormalizedCognitiveInput, Hypothesis } from './beliefTypes'
import { newCognitiveId, nowISO } from './cognitiveUtils'

const HYPOTHESIS_SEEDS: { statement: string; topic: Hypothesis['topic']; trigger: (input: NormalizedCognitiveInput) => boolean }[] = [
  {
    statement: 'Users may not understand FounderOS in under sixty seconds',
    topic: 'product',
    trigger: (i) => (i.founderSnapshot?.architectureScore ?? 100) < 55,
  },
  {
    statement: 'Validation evidence may be weaker than assumed',
    topic: 'validation',
    trigger: (i) => (i.founderSnapshot?.validationScore ?? 100) < 50,
  },
  {
    statement: 'Execution pace may be outpacing learning loops',
    topic: 'execution',
    trigger: (i) => (i.founderSnapshot?.executionScore ?? 0) > 70 && (i.founderSnapshot?.validationScore ?? 100) < 55,
  },
  {
    statement: 'The current bottleneck may be blocking momentum',
    topic: 'strategy',
    trigger: (i) => Boolean(i.founderSnapshot?.mainBottleneck && i.founderSnapshot.mainBottleneck !== 'None'),
  },
]

export function generateHypotheses(input: NormalizedCognitiveInput, existing: Hypothesis[]): Hypothesis[] {
  const result = [...existing]
  const existingStatements = new Set(existing.map((h) => h.statement.toLowerCase()))

  for (const seed of HYPOTHESIS_SEEDS) {
    if (!seed.trigger(input)) continue
    if (existingStatements.has(seed.statement.toLowerCase())) continue
    result.push({
      id: newCognitiveId('hyp'),
      statement: seed.statement,
      topic: seed.topic,
      confidence: 45,
      status: 'open',
      evidenceFor: [],
      evidenceAgainst: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    })
    existingStatements.add(seed.statement.toLowerCase())
  }

  for (const cb of input.conversationBeliefs) {
    if (cb.status !== 'inferred' && cb.status !== 'possible') continue
    const stmt = `${cb.label}: ${cb.displayValue}`
    if (existingStatements.has(stmt.toLowerCase())) continue
    result.push({
      id: newCognitiveId('hyp'),
      statement: stmt,
      topic: 'founder',
      confidence: cb.confidence,
      status: 'open',
      evidenceFor: [],
      evidenceAgainst: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    })
  }

  return result.slice(0, 12)
}

export function updateHypothesisFromAnswer(
  hypothesis: Hypothesis,
  answerSupports: boolean,
  evidenceId: string,
): Hypothesis {
  const forList = answerSupports
    ? [...hypothesis.evidenceFor, evidenceId]
    : hypothesis.evidenceFor
  const againstList = !answerSupports
    ? [...hypothesis.evidenceAgainst, evidenceId]
    : hypothesis.evidenceAgainst

  let confidence = hypothesis.confidence
  let status = hypothesis.status
  if (answerSupports) {
    confidence = Math.min(95, confidence + 15)
    if (confidence >= 75) status = 'supported'
  } else {
    confidence = Math.max(10, confidence - 20)
    if (confidence <= 25) status = 'rejected'
  }

  return {
    ...hypothesis,
    evidenceFor: forList,
    evidenceAgainst: againstList,
    confidence,
    status,
    updatedAt: nowISO(),
  }
}

export function hypothesisToTestPhrase(h: Hypothesis): string {
  return `Can I test a hypothesis? ${h.statement} (confidence: ${h.confidence}%)`
}

export function findActiveHypothesis(hypotheses: Hypothesis[]): Hypothesis | null {
  return hypotheses.find((h) => h.status === 'open') ?? null
}
