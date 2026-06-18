'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'

interface Props {
  onSend: (message: string) => void
  disabled?: boolean
}

const SUGGESTED_PROMPTS = [
  'Help me plan my first sprint',
  'What are the biggest risks for this project?',
  'Draft a roadmap for V1',
  'What decision should I make next?',
]

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-2">
      {/* Suggested prompts — only show when input is empty */}
      {!value && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setValue(prompt)}
              className="px-3 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-full hover:border-zinc-400 hover:text-zinc-700 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="bg-white rounded-xl border border-zinc-200 focus-within:border-zinc-400 transition-colors p-3 flex items-end gap-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this project… (Enter to send)"
          disabled={disabled}
          className="flex-1 text-sm text-zinc-800 placeholder:text-zinc-400 resize-none outline-none leading-relaxed disabled:opacity-50 min-h-[24px]"
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="shrink-0 w-8 h-8 flex items-center justify-center bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {disabled
            ? <Loader2 size={14} className="animate-spin" />
            : <ArrowUp size={14} />
          }
        </button>
      </div>
      <p className="text-xs text-zinc-400 text-center">
        Shift+Enter for new line · Enter to send
      </p>
    </div>
  )
}
