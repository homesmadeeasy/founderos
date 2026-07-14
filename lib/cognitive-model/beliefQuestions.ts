import type { Belief, BeliefContradiction, CognitiveQuestion, Unknown, WorldModel } from './beliefTypes'
import { normalizeWorldModel } from './cognitiveNormalize'
import { asString, nowISO } from './cognitiveUtils'

function stableQuestionId(parts: {
  text: string
  topic: CognitiveQuestion['topic']
  targetBeliefId?: string
  targetUnknownId?: string
  targetHypothesisId?: string
}): string {
  const anchor = parts.targetBeliefId
    ?? parts.targetUnknownId
    ?? parts.targetHypothesisId
    ?? parts.text
  return `q-${parts.topic}-${anchor.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}`
}

const QUESTION_TEMPLATES: { topic: CognitiveQuestion['topic']; text: string; importance: number }[] = [
  { topic: 'validation', text: 'How many real users have tested the product in the last two weeks?', importance: 0.9 },
  { topic: 'validation', text: 'What did users say when they first saw the product?', importance: 0.85 },
  { topic: 'product', text: 'Can a new visitor understand what FounderOS does in under sixty seconds?', importance: 0.88 },
  { topic: 'execution', text: 'What is the single most important thing to ship this week?', importance: 0.8 },
  { topic: 'strategy', text: 'What is the biggest bottleneck slowing momentum right now?', importance: 0.82 },
  { topic: 'founder', text: 'What stage are you really at — idea, prototype, MVP, or validation?', importance: 0.75 },
  { topic: 'vision', text: 'In one sentence, what change are you trying to create in the world?', importance: 0.7 },
]

export function selectHighestValueQuestion(world: WorldModel): CognitiveQuestion | null {
  const model = normalizeWorldModel(world)
  const candidates: CognitiveQuestion[] = []

  for (const u of model.unknowns) {
    const reduction = u.importance === 'critical' ? 0.95 : u.importance === 'high' ? 0.85 : 0.6
    candidates.push({
      id: stableQuestionId({ text: `I don't yet know: ${u.statement}. Can you help me understand?`, topic: u.topic, targetUnknownId: u.id }),
      text: `I don't yet know: ${u.statement}. Can you help me understand?`,
      topic: u.topic,
      targetUnknownId: u.id,
      uncertaintyReduction: reduction,
      reason: `Resolving unknown: ${u.statement}`,
    })
  }

  for (const h of model.currentHypotheses.filter((x) => x.status === 'open')) {
    candidates.push({
      id: stableQuestionId({ text: `I'd like to test: ${h.statement}. What evidence do you have?`, topic: h.topic, targetHypothesisId: h.id }),
      text: `I'd like to test: ${h.statement}. What evidence do you have?`,
      topic: h.topic,
      targetHypothesisId: h.id,
      uncertaintyReduction: 0.8,
      reason: `Testing hypothesis: ${h.statement}`,
    })
  }

  for (const b of model.beliefs.filter((x) => x.status === 'unknown' || x.confidence < 40)) {
    candidates.push({
      id: stableQuestionId({ text: `I'm uncertain about: ${b.statement}. What can you tell me?`, topic: b.topic, targetBeliefId: b.id }),
      text: `I'm uncertain about: ${b.statement}. What can you tell me?`,
      topic: b.topic,
      targetBeliefId: b.id,
      uncertaintyReduction: 0.7,
      reason: `Low-confidence belief: ${b.statement}`,
    })
  }

  for (const c of model.contradictions.filter((x) => !x.resolved)) {
    candidates.push({
      id: stableQuestionId({ text: `I see conflicting evidence about ${c.description}. Which is more accurate today?`, topic: 'general' }),
      text: `I see conflicting evidence about ${c.description}. Which is more accurate today?`,
      topic: 'general',
      uncertaintyReduction: 0.92,
      reason: `Contradiction: ${c.description}`,
    })
  }

  for (const t of QUESTION_TEMPLATES) {
    const alreadyCovered = candidates.some((q) => q.text.includes(t.text.slice(0, 30)))
    if (alreadyCovered) continue
    const relatedBelief = model.beliefs.find((b) => b.topic === t.topic && b.confidence < 60)
    if (!relatedBelief && t.importance < 0.8) continue
    candidates.push({
      id: stableQuestionId({ text: t.text, topic: t.topic, targetBeliefId: relatedBelief?.id }),
      text: t.text,
      topic: t.topic,
      targetBeliefId: relatedBelief?.id,
      uncertaintyReduction: t.importance,
      reason: `Standard uncertainty reduction for ${t.topic}`,
    })
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.uncertaintyReduction - a.uncertaintyReduction)
  return candidates[0] ?? null
}

export function buildOpenQuestions(world: WorldModel): CognitiveQuestion[] {
  const model = normalizeWorldModel(world)
  const top = selectHighestValueQuestion(model)
  const rest = model.unknowns.slice(0, 3).map((u) => ({
    id: stableQuestionId({ text: u.statement, topic: u.topic, targetUnknownId: u.id }),
    text: u.statement,
    topic: u.topic,
    targetUnknownId: u.id,
    uncertaintyReduction: 0.5,
    reason: 'Open unknown',
  }))
  return top ? [top, ...rest.filter((r) => r.text !== top.text)].slice(0, 5) : rest
}

export function questionForBelief(belief: Belief): CognitiveQuestion {
  return {
    id: stableQuestionId({
      text: `What evidence supports or challenges: "${belief.statement}"?`,
      topic: belief.topic,
      targetBeliefId: belief.id,
    }),
    text: `What evidence supports or challenges: "${belief.statement}"?`,
    topic: belief.topic,
    targetBeliefId: belief.id,
    uncertaintyReduction: 0.75,
    reason: `Follow-up for belief: ${belief.statement}`,
  }
}
