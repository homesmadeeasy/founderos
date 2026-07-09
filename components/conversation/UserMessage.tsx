'use client'

import type { ConversationTurn } from '@/lib/conversation/conversationTypes'
import { formatConversationTime } from '@/lib/conversation/conversationUtils'

interface UserMessageProps {
  turn: ConversationTurn
}

export default function UserMessage({ turn }: UserMessageProps) {
  const time = formatConversationTime(turn.createdAt)

  return (
    <article className="conv-msg conv-msg-user animate-fade-in-up" aria-label="Your message">
      <div className="conv-msg-user-body">
        <p className="conv-msg-user-text">{turn.content}</p>
        {time && <time className="conv-msg-user-time" dateTime={turn.createdAt}>{time}</time>}
      </div>
    </article>
  )
}
