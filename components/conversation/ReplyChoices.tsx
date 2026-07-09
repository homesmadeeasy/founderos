'use client'

import { useState } from 'react'
import { formatChipAnswer } from '@/lib/conversation/conversationUtils'

const PRIMARY_CHOICES = ['Yes', 'Tell me more'] as const
const SECONDARY_CHOICES = ['No', 'Maybe', 'Later', "I don't know"] as const

interface ReplyChoicesProps {
  onReply: (answer: string) => void
  disabled?: boolean
  onCustomFocus?: () => void
  visible?: boolean
}

export default function ReplyChoices({
  onReply,
  disabled,
  onCustomFocus,
  visible = true,
}: ReplyChoicesProps) {
  const [selected, setSelected] = useState<string | null>(null)

  if (!visible) return null

  function handleChoice(choice: string) {
    if (disabled || selected) return
    setSelected(choice)
    onReply(formatChipAnswer(choice))
  }

  function handleCustom() {
    if (disabled) return
    onCustomFocus?.()
  }

  return (
    <div className="conv-reply-choices animate-fade-in-up" role="group" aria-label="Quick replies">
      <div className="conv-reply-row conv-reply-primary">
        {PRIMARY_CHOICES.map(choice => (
          <button
            key={choice}
            type="button"
            disabled={disabled || Boolean(selected)}
            aria-pressed={selected === choice}
            onClick={() => handleChoice(choice)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleChoice(choice) }}
            className={`conv-reply-btn conv-reply-btn-primary ${selected === choice ? 'conv-reply-btn-selected' : ''}`}
          >
            {choice}
          </button>
        ))}
      </div>
      <div className="conv-reply-row conv-reply-secondary">
        {SECONDARY_CHOICES.map(choice => (
          <button
            key={choice}
            type="button"
            disabled={disabled || Boolean(selected)}
            aria-pressed={selected === choice}
            onClick={() => handleChoice(choice)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleChoice(choice) }}
            className={`conv-reply-btn conv-reply-btn-secondary ${selected === choice ? 'conv-reply-btn-selected' : ''}`}
          >
            {choice === 'Later' ? 'Maybe later' : choice}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={handleCustom}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleCustom() }}
          className="conv-reply-btn conv-reply-btn-ghost"
        >
          Custom reply
        </button>
      </div>
    </div>
  )
}
