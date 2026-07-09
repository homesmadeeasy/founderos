import type { ConversationMemoryWrite, ConversationSession } from './conversationTypes'
import { newConversationId, nowISO, clampConfidence } from './conversationUtils'

const MEMORY_CONFIDENCE_THRESHOLD = 65

const SHORT_ANSWERS = new Set([
  'yes', 'no', 'maybe', 'later', 'tell me more', "i don't know",
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
  return session.confidence >= MEMORY_CONFIDENCE_THRESHOLD && meaningful.length > 0
}

export function buildMemoryWriteFromSession(session: ConversationSession): ConversationMemoryWrite | null {
  if (!shouldWriteMemory(session)) return null

  const userAnswers = meaningfulUserTurns(session)
    .map(t => t.content)
    .join('\n\n')

  const recommendation = session.recommendation?.action ?? session.topic

  return {
    id: newConversationId(),
    title: `Founder AI: ${session.topic} conversation`,
    content: [
      userAnswers,
      session.recommendation ? `Recommendation: ${recommendation}` : '',
      session.summary?.summary ?? '',
    ].filter(Boolean).join('\n\n'),
    confidence: clampConfidence(session.confidence),
    createdAt: nowISO(),
  }
}

export function buildKnowledgeSuggestionFromSession(session: ConversationSession): string | null {
  if (session.confidence < 70) return null
  const userInsight = meaningfulUserTurns(session).find(t => t.content.length > 30)
  if (!userInsight) return null
  if (session.topic === 'validation') {
    return `Validation insight: ${userInsight.content.slice(0, 160)}`
  }
  if (session.topic === 'founder' || session.topic === 'strategy') {
    return `Founder principle: ${userInsight.content.slice(0, 160)}`
  }
  return null
}
