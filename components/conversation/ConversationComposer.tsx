'use client'

import { useRef, useState, KeyboardEvent } from 'react'
import { Send, Zap } from 'lucide-react'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'

interface ConversationComposerProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}

export default function ConversationComposer({
  onSend,
  disabled,
  placeholder = 'Reply to Founder AI…',
  inputRef,
}: ConversationComposerProps) {
  const [text, setText] = useState('')
  const localRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef ?? localRef
  const { openCapture } = useUniversalCapture()

  function send() {
    const value = text.trim()
    if (!value || disabled) return
    onSend(value)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <div className="conv-composer">
      <div className="conv-composer-inner">
        <button
          type="button"
          onClick={openCapture}
          className="conv-composer-capture"
          aria-label="Open capture"
          title="Capture anything"
        >
          <Zap size={16} className="text-amber-500" />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="conv-composer-input"
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || !text.trim()}
          className="conv-composer-send"
          aria-label="Send reply"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
