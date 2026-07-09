'use client'

import type { ConversationTurn } from '@/lib/conversation/conversationTypes'
import ConversationEvidenceChips from './ConversationEvidenceChips'

interface ConversationBubbleProps {
  turn: ConversationTurn
}

function formatContent(content: string): React.ReactNode {
  const parts = content.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-medium text-zinc-900">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export default function ConversationBubble({ turn }: ConversationBubbleProps) {
  const isUser = turn.role === 'user'
  const isAI = turn.role === 'founder_ai'

  return (
    <div
      className={`conv-bubble animate-fade-in-up ${isUser ? 'conv-bubble-user' : 'conv-bubble-ai'}`}
    >
      {isAI && (
        <div className="conv-bubble-avatar" aria-hidden>
          <span>FA</span>
        </div>
      )}
      <div className={`conv-bubble-body ${isUser ? 'conv-bubble-body-user' : 'conv-bubble-body-ai'}`}>
        {isAI && (
          <p className="conv-bubble-label">Founder AI</p>
        )}
        <div className="conv-bubble-text whitespace-pre-wrap">
          {formatContent(turn.content)}
        </div>
        {isAI && turn.evidence.length > 0 && (
          <ConversationEvidenceChips evidence={turn.evidence} compact />
        )}
      </div>
    </div>
  )
}
