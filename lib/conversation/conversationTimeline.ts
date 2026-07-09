import type { ConversationTimelineEntry, ConversationSession } from './conversationTypes'
import { newConversationId, nowISO } from './conversationUtils'

export function buildTimelineFromSession(session: ConversationSession): ConversationTimelineEntry[] {
  const entries: ConversationTimelineEntry[] = []

  entries.push({
    id: newConversationId(),
    sessionId: session.id,
    type: 'question',
    title: `Started: ${session.topic}`,
    detail: session.turns.find(t => t.role === 'founder_ai')?.content.slice(0, 120) ?? '',
    timestamp: session.startedAt,
    relatedIds: [session.id],
  })

  for (const turn of session.turns) {
    if (turn.role === 'user') {
      entries.push({
        id: newConversationId(),
        sessionId: session.id,
        type: 'answer',
        title: turn.questionId ?? 'reply',
        detail: turn.content.slice(0, 200),
        timestamp: turn.createdAt,
        relatedIds: turn.questionId ? [turn.questionId] : [],
      })
    }
  }

  for (const mw of session.memoryWrites) {
    entries.push({
      id: newConversationId(),
      sessionId: session.id,
      type: 'memory',
      title: mw.title,
      detail: mw.content.slice(0, 120),
      timestamp: mw.createdAt,
      relatedIds: mw.memoryId ? [mw.memoryId] : [],
    })
  }

  for (const ks of session.knowledgeSuggestions) {
    entries.push({
      id: newConversationId(),
      sessionId: session.id,
      type: 'knowledge',
      title: 'Knowledge suggested',
      detail: ks.slice(0, 120),
      timestamp: nowISO(),
      relatedIds: [],
    })
  }

  if (session.summary) {
    entries.push({
      id: newConversationId(),
      sessionId: session.id,
      type: 'kernel',
      title: 'Summary created',
      detail: session.summary.summary,
      timestamp: session.summary.createdAt,
      relatedIds: [session.summary.id],
    })
  }

  return entries
}
