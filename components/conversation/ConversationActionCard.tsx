'use client'

import type { ConversationActionCard } from '@/lib/conversation/conversationTypes'

interface ConversationActionCardProps {
  card: ConversationActionCard
  turnId: string
  onAction?: (action: string, turnId: string) => void
  disabled?: boolean
}

export default function ConversationActionCard({
  card,
  turnId,
  onAction,
  disabled,
}: ConversationActionCardProps) {
  return (
    <div className="conv-action-card animate-fade-in-up">
      <p className="conv-action-card-title">{card.title}</p>
      <ul className="conv-action-card-steps">
        {card.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ul>
      <div className="conv-action-card-actions">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction?.('start_sprint', turnId)}
          className="conv-action-btn conv-action-btn-primary"
        >
          Start validation sprint
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction?.('add_tasks', turnId)}
          className="conv-action-btn conv-action-btn-secondary"
        >
          Add tasks
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction?.('defer', turnId)}
          className="conv-action-btn conv-action-btn-secondary"
        >
          Maybe later
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction?.('why', turnId)}
          className="conv-action-btn conv-action-btn-ghost"
        >
          Why this?
        </button>
      </div>
    </div>
  )
}
