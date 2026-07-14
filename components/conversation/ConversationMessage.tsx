'use client'

import type { ConversationTurn } from '@/lib/conversation/conversationTypes'
import type { FounderProposalBundle } from '@/lib/ai/founder/founderAI.types'
import AssistantMessage from './AssistantMessage'
import UserMessage from './UserMessage'

interface ConversationMessageProps {
  turn: ConversationTurn
  showEvidence?: boolean
  onAction?: (action: string, turnId: string) => void
  proposal?: FounderProposalBundle | null
  onApproveAction?: (proposalId: string, actionId: string, editedPayload?: Record<string, unknown>) => void
  onApproveBeliefs?: (proposalId: string) => void
  onDismissProposal?: (proposalId: string) => void
}

export default function ConversationMessage({
  turn,
  showEvidence = true,
  onAction,
  proposal,
  onApproveAction,
  onApproveBeliefs,
  onDismissProposal,
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
        proposal={proposal}
        onApproveAction={onApproveAction}
        onApproveBeliefs={onApproveBeliefs}
        onDismissProposal={onDismissProposal}
      />
    )
  }
  return null
}
