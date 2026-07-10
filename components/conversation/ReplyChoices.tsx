'use client'

import { useState } from 'react'
import { formatChipAnswer } from '@/lib/conversation/conversationUtils'

interface ReplyChoicesProps {
  onReply: (answer: string) => void
  disabled?: boolean
  onCustomFocus?: () => void
  visible?: boolean
  answerOptions?: string[]
}

export default function ReplyChoices({
  onReply,
  disabled,
  onCustomFocus,
  visible = true,
  answerOptions = [],
}: ReplyChoicesProps) {
  const [selected, setSelected] = useState<string | null>(null)

  if (!visible || answerOptions.length === 0) return null

  const primary = answerOptions.slice(0, 2)
  const secondary = answerOptions.slice(2)

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
      {primary.length > 0 && (
        <div className="conv-reply-row conv-reply-primary">
          {primary.map(choice => (
            <button
              key={choice}
              type="button"
              disabled={disabled || Boolean(selected)}
              aria-pressed={selected === choice}
              onClick={() => handleChoice(choice)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChoice(choice) } }}
              className={`conv-reply-btn conv-reply-btn-primary ${selected === choice ? 'conv-reply-btn-selected' : ''}`}
            >
              {choice}
            </button>
          ))}
        </div>
      )}
      <div className="conv-reply-row conv-reply-secondary">
        {secondary.map(choice => (
          <button
            key={choice}
            type="button"
            disabled={disabled || Boolean(selected)}
            aria-pressed={selected === choice}
            onClick={() => handleChoice(choice)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChoice(choice) } }}
            className={`conv-reply-btn conv-reply-btn-secondary ${selected === choice ? 'conv-reply-btn-selected' : ''}`}
          >
            {choice}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={handleCustom}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCustom() } }}
          className="conv-reply-btn conv-reply-btn-ghost"
        >
          Custom reply
        </button>
      </div>
    </div>
  )
}
