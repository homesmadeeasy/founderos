'use client'

import { MessageCircle } from 'lucide-react'

interface ConversationEmptyStateProps {
  onStart: () => void
}

export default function ConversationEmptyState({ onStart }: ConversationEmptyStateProps) {
  return (
    <div className="conv-empty">
      <div className="conv-empty-icon" aria-hidden>
        <MessageCircle size={28} strokeWidth={1.5} />
      </div>
      <h3 className="conv-empty-title">Ready when you are</h3>
      <p className="conv-empty-text">
        Founder AI reads your live state and starts strategic conversations — always grounded in evidence.
      </p>
      <button type="button" onClick={onStart} className="conv-empty-btn">
        Start conversation
      </button>
    </div>
  )
}
