'use client'

import { Sparkles } from 'lucide-react'
import type { ConversationTurn } from '@/lib/conversation/conversationTypes'
import type { FounderProposalBundle } from '@/lib/ai/founder/founderAI.types'
import { formatConversationTime } from '@/lib/conversation/conversationUtils'
import EvidenceChips from './EvidenceChips'
import ConversationActionCard from './ConversationActionCard'
import FounderAIMessageExtras from './FounderAIMessageExtras'

interface AssistantMessageProps {
  turn: ConversationTurn
  showEvidence?: boolean
  onAction?: (action: string, turnId: string) => void
  proposal?: FounderProposalBundle | null
  onApproveAction?: (proposalId: string, actionId: string, editedPayload?: Record<string, unknown>) => void
  onApproveBeliefs?: (proposalId: string) => void
  onDismissProposal?: (proposalId: string) => void
}

function renderParagraph(text: string, key: number) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <p key={key} className="conv-msg-paragraph">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-medium text-zinc-800">{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

export default function AssistantMessage({
  turn,
  showEvidence = true,
  onAction,
  proposal,
  onApproveAction,
  onApproveBeliefs,
  onDismissProposal,
}: AssistantMessageProps) {
  const paragraphs = turn.content.split('\n\n').filter(Boolean)
  const time = formatConversationTime(turn.createdAt)

  return (
    <article className="conv-msg conv-msg-ai animate-fade-in-up" aria-label="Founder AI message">
      <div className="conv-msg-ai-avatar" aria-hidden>
        <Sparkles size={14} strokeWidth={2} />
      </div>
      <div className="conv-msg-ai-body">
        <header className="conv-msg-ai-header">
          <span className="conv-msg-ai-label">Founder AI</span>
          {time && <time className="conv-msg-time" dateTime={turn.createdAt} suppressHydrationWarning>{time}</time>}
        </header>
        <div className="conv-msg-ai-content">
          {paragraphs.map((p, i) => renderParagraph(p, i))}
        </div>
        {showEvidence && turn.evidence.length > 0 && (
          <EvidenceChips evidence={turn.evidence} max={4} compact />
        )}
        {turn.actionCard && (
          <ConversationActionCard
            card={turn.actionCard}
            turnId={turn.id}
            onAction={onAction}
          />
        )}
        {proposal && onApproveAction && onApproveBeliefs && onDismissProposal && (
          <FounderAIMessageExtras
            proposal={proposal}
            evidence={turn.evidence.map((e) => ({
              id: e.id,
              title: e.title,
              summary: e.summary,
              weight: e.weight,
              supports: e.supports,
              sourceType: e.sourceType,
            }))}
            onApproveAction={onApproveAction}
            onDismissAction={(proposalId, actionId) => {
              onDismissProposal(proposalId)
              void actionId
            }}
            onApproveBeliefs={onApproveBeliefs}
            onDismissProposal={onDismissProposal}
          />
        )}
      </div>
    </article>
  )
}
