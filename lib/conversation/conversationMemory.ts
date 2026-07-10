import type { ConversationMemoryWrite, ConversationSession } from './conversationTypes'
import { getBelief, VALIDATION_BELIEF_KEYS } from './conversationBeliefs'
import { newConversationId, nowISO, clampConfidence } from './conversationUtils'

const MEMORY_CONFIDENCE_THRESHOLD = 65

const SHORT_ANSWERS = new Set([
  'yes', 'no', 'maybe', 'later', 'tell me more', "i don't know", "i'm not sure", 'not sure',
])

export function isMeaningfulUserAnswer(content: string): boolean {
  const trimmed = content.trim()
  if (trimmed.length < 12) return false
  if (SHORT_ANSWERS.has(trimmed.toLowerCase())) return false
  return true
}

export function meaningfulUserTurns(session: ConversationSession) {
  return session.turns.filter(t => t.role === 'user' && isMeaningfulUserAnswer(t.content))
}

export function shouldWriteMemory(session: ConversationSession): boolean {
  const meaningful = meaningfulUserTurns(session)
  const hasConfirmedBelief = session.beliefs?.some(
    b => b.status === 'confirmed' && b.key.startsWith('validation.'),
  )
  return session.confidence >= MEMORY_CONFIDENCE_THRESHOLD
    && (meaningful.length > 0 || Boolean(hasConfirmedBelief))
}

export function buildMemoryWriteFromSession(session: ConversationSession): ConversationMemoryWrite | null {
  if (!shouldWriteMemory(session)) return null

  const userAnswers = meaningfulUserTurns(session).map(t => t.content)
  const beliefNotes = session.beliefs
    ?.filter(b => b.status === 'confirmed' && b.key.startsWith('validation.'))
    .map(b => `${b.label}: ${b.displayValue}`) ?? []

  const count = getBelief(session.beliefs ?? [], VALIDATION_BELIEF_KEYS.userCount)
  const surface = getBelief(session.beliefs ?? [], VALIDATION_BELIEF_KEYS.testedSurface)
  const title = count?.status === 'confirmed' && surface?.status === 'confirmed'
    ? `Validation: ${count.displayValue} tested ${surface.displayValue}`
    : `Founder AI: ${session.topic} conversation`

  return {
    id: newConversationId(),
    title,
    content: [...userAnswers, ...beliefNotes,
      session.recommendation ? `Recommendation: ${session.recommendation.action}` : '',
      session.summary?.summary ?? '',
    ].filter(Boolean).join('\n\n'),
    confidence: clampConfidence(session.confidence),
    createdAt: nowISO(),
  }
}

export function buildKnowledgeSuggestionFromSession(session: ConversationSession): string | null {
  if (session.confidence < 70) return null
  const userInsight = meaningfulUserTurns(session).find(t => t.content.length > 30)
  const confirmed = session.beliefs?.find(b => b.status === 'confirmed' && b.key.includes('confusion'))
  const text = userInsight?.content ?? confirmed?.displayValue
  if (!text || text.length < 20) return null
  if (session.topic === 'validation') {
    return `Validation insight: ${text.slice(0, 160)}`
  }
  if (session.topic === 'founder' || session.topic === 'strategy') {
    return `Founder principle: ${text.slice(0, 160)}`
  }
  return null
}
