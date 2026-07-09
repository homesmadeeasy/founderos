import type { ConversationSession, ConversationSummary, ConversationTurn } from './conversationTypes'
import { newConversationId, nowISO } from './conversationUtils'

export function buildConversationSummary(session: ConversationSession): ConversationSummary {
  const userTurns = session.turns.filter(t => t.role === 'user')
  const aiTurns = session.turns.filter(t => t.role === 'founder_ai')

  const keyInsights: string[] = []
  if (session.recommendation) {
    keyInsights.push(session.recommendation.action)
  }
  for (const turn of userTurns.slice(-3)) {
    if (turn.content.length > 10) {
      keyInsights.push(turn.content.slice(0, 120))
    }
  }

  const opening = aiTurns[0]?.content ?? 'Conversation held'
  const answers = userTurns.length

  return {
    id: newConversationId(),
    sessionId: session.id,
    topic: session.topic,
    summary: `${opening.split('\n')[0]} — ${answers} answer(s) recorded.`,
    keyInsights: keyInsights.slice(0, 4),
    createdAt: nowISO(),
  }
}

export function summarizeTurns(turns: ConversationTurn[]): string {
  const user = turns.filter(t => t.role === 'user').map(t => t.content).join(' ')
  const ai = turns.filter(t => t.role === 'founder_ai').map(t => t.content.split('\n')[0]).join(' ')
  if (!user) return ai.slice(0, 200)
  return `Discussed: ${ai.slice(0, 80)}. User said: ${user.slice(0, 120)}`
}
