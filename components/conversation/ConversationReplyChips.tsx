'use client'

import { useState } from 'react'
import { REPLY_CHIPS } from '@/lib/conversation/conversationUtils'

interface ConversationReplyChipsProps {
  onReply: (answer: string) => void
  disabled?: boolean
}

export default function ConversationReplyChips({ onReply, disabled }: ConversationReplyChipsProps) {
  const [custom, setCustom] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  function sendCustom() {
    const text = custom.trim()
    if (!text) return
    onReply(text)
    setCustom('')
    setShowCustom(false)
  }

  return (
    <div className="conv-reply-chips">
      <div className="flex flex-wrap gap-2">
        {REPLY_CHIPS.map(chip => (
          <button
            key={chip}
            type="button"
            disabled={disabled}
            onClick={() => onReply(chip)}
            className="conv-chip"
          >
            {chip}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowCustom(v => !v)}
          className="conv-chip conv-chip-muted"
        >
          Custom reply
        </button>
      </div>
      {showCustom && (
        <div className="flex gap-2 mt-2">
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendCustom() }}
            placeholder="Type your reply…"
            className="flex-1 rounded-xl border border-white/90 bg-white/60 backdrop-blur px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={sendCustom}
            disabled={disabled || !custom.trim()}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm disabled:opacity-40"
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}
