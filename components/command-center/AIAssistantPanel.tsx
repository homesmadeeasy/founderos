'use client'

import { useRef, useState } from 'react'
import { Bot, Loader2, RotateCcw, Send } from 'lucide-react'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import { SUGGESTED_PROMPTS } from '@/lib/command-center/assistantLogic'
import CardShell from './CardShell'

export default function AIAssistantPanel() {
  const { state, askAssistant, clearAssistant } = useCommandCenter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function submit(prompt: string) {
    const text = prompt.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    try {
      await askAssistant(text)
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <CardShell
      title="AI Assistant"
      icon={Bot}
      className="lg:row-span-2"
      action={
        state.aiMessages.length > 0 ? (
          <button
            type="button"
            onClick={clearAssistant}
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1"
          >
            <RotateCcw size={12} /> Clear
          </button>
        ) : null
      }
    >
      <div className="flex flex-col h-full min-h-[320px]">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto mb-4 pr-1 max-h-[280px]">
          {state.aiMessages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500 leading-relaxed">
                Ask about your focus, projects, blockers or health. Responses are generated locally from your data for now.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submit(prompt)}
                    className="text-xs text-left px-3 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            state.aiMessages.map(msg => (
              <div
                key={msg.id}
                className={`text-sm leading-relaxed rounded-xl px-3 py-2.5 whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-zinc-900 text-white ml-8'
                    : 'bg-zinc-50 text-zinc-700 border border-zinc-100 mr-4'
                }`}
              >
                {msg.content}
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </div>
          )}
        </div>

        <form
          onSubmit={e => { e.preventDefault(); void submit(input) }}
          className="flex gap-2 mt-auto pt-3 border-t border-zinc-100"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about your day…"
            className="flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-zinc-900 text-white disabled:opacity-40 hover:bg-zinc-800 transition-colors"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </CardShell>
  )
}
