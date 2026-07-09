'use client'

import type { ConversationTurn } from '@/lib/conversation/conversationTypes'
import AssistantMessage from './AssistantMessage'
import UserMessage from './UserMessage'

interface ConversationMessageProps {
  turn: ConversationTurn
  showEvidence?: boolean
  onAction?: (action: string, turnId: string) => void
}

export default function ConversationMessage({
  turn,
  showEvidence = true,
  onAction,
}: ConversationMessageProps) {
  if (turn.role === 'user') {
    return <UserMessage turn={turn} />
  }
  if (turn.role === 'founder_ai') {
    return (
      <AssistantMessage
        turn={turn}
        showEvidence={showEvidence}
        onAction={onAction}
      />
    )
  }
  return null
}
