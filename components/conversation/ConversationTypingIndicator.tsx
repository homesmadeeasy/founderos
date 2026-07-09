'use client'

import { Sparkles } from 'lucide-react'

export default function ConversationTypingIndicator() {
  return (
    <article className="conv-msg conv-msg-ai animate-fade-in-up" aria-label="Founder AI is thinking">
      <div className="conv-msg-ai-avatar" aria-hidden>
        <Sparkles size={14} strokeWidth={2} />
      </div>
      <div className="conv-msg-ai-body">
        <header className="conv-msg-ai-header">
          <span className="conv-msg-ai-label">Founder AI</span>
        </header>
        <div className="conv-typing" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </article>
  )
}
