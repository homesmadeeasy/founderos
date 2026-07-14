'use client'

import { Sparkles } from 'lucide-react'
import type { FounderReasoningMode } from '@/lib/ai/founder/founderAI.types'

interface FounderAIThinkingIndicatorProps {
  mode: FounderReasoningMode
}

export default function FounderAIThinkingIndicator({ mode }: FounderAIThinkingIndicatorProps) {
  const label = mode === 'thinking'
    ? 'Founder AI is thinking…'
    : mode === 'llm'
      ? 'Synthesizing strategic response…'
      : 'Reasoning from your evidence…'

  return (
    <div className="conv-msg conv-msg-ai animate-fade-in-up" aria-live="polite">
      <div className="conv-msg-ai-avatar" aria-hidden>
        <Sparkles size={14} strokeWidth={2} className="animate-pulse" />
      </div>
      <div className="conv-msg-ai-body">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-violet-50 border border-violet-100">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="text-xs text-violet-700 font-medium">{label}</span>
        </div>
      </div>
    </div>
  )
}
