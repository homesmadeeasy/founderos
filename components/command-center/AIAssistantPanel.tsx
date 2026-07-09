'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Loader2, MessageCircle, RotateCcw, Send, Sparkles } from 'lucide-react'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import { useConversation } from '@/contexts/ConversationContext'
import ConversationMessage from '@/components/conversation/ConversationMessage'
import ConversationTypingIndicator from '@/components/conversation/ConversationTypingIndicator'
import CardShell from './CardShell'

const TOPIC_SHORTCUTS = [
  { label: 'Ask Founder', topic: 'founder' as const },
  { label: 'Ask School', topic: 'school' as const },
  { label: 'Ask Health', topic: 'health' as const },
]

export default function AIAssistantPanel() {
  const router = useRouter()
  const { state, askAssistant, clearAssistant } = useCommandCenter()
  const {
    session, store, questionChips, isTyping, continueSession, reply, start,
  } = useConversation()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'conversation' | 'legacy'>('conversation')
  const scrollRef = useRef<HTMLDivElement>(null)

  const recentTurns = session?.turns.slice(-4) ?? []
  const finishedYesterday = store.sessions.find(s =>
    s.status === 'finished'
    && s.updatedAt.slice(0, 10) !== new Date().toISOString().slice(0, 10),
  )

  async function submitLegacy(prompt: string) {
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

  function openFounder(topic?: 'founder' | 'school' | 'health') {
    start(topic)
    router.push('/founder')
  }

  return (
    <CardShell
      title="Founder AI"
      icon={Bot}
      className="lg:row-span-2"
      action={
        <button
          type="button"
          onClick={() => {
            if (mode === 'conversation') clearAssistant()
            else setMode('conversation')
          }}
          className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1"
        >
          <RotateCcw size={12} /> {mode === 'conversation' ? 'Clear chat' : 'Conversation'}
        </button>
      }
    >
      <div className="flex flex-col h-full min-h-[360px]">
        <div className="flex flex-wrap gap-2 mb-3">
          {TOPIC_SHORTCUTS.map(s => (
            <button
              key={s.label}
              type="button"
              onClick={() => openFounder(s.topic)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-violet-100 bg-violet-50/60 text-violet-700 hover:bg-violet-50 transition-colors"
            >
              {s.label}
            </button>
          ))}
          {finishedYesterday && (
            <button
              type="button"
              onClick={() => { continueSession(); router.push('/founder') }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Continue yesterday
            </button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto mb-4 pr-1 max-h-[300px]">
          {mode === 'conversation' ? (
            recentTurns.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-500 leading-relaxed flex items-start gap-2">
                  <Sparkles size={14} className="text-violet-500 mt-0.5 shrink-0" />
                  Founder AI reads your engines and starts strategic conversations — no hallucinations, always evidence-backed.
                </p>
                <button
                  type="button"
                  onClick={() => openFounder()}
                  className="w-full text-sm px-4 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={14} />
                  Ask Founder
                </button>
                <div className="flex flex-wrap gap-2">
                  {questionChips.slice(0, 4).map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => { start(); router.push('/founder') }}
                      className="text-xs text-left px-3 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {recentTurns.map(turn => (
                  <ConversationMessage key={turn.id} turn={turn} showEvidence={false} />
                ))}
                {isTyping && <ConversationTypingIndicator />}
              </>
            )
          ) : (
            state.aiMessages.length === 0 ? (
              <p className="text-sm text-zinc-500">Legacy assistant mode — type a question below.</p>
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
            )
          )}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </div>
          )}
        </div>

        <form
          onSubmit={e => {
            e.preventDefault()
            if (mode === 'conversation' && session) {
              void reply(input.trim())
              setInput('')
            } else {
              void submitLegacy(input)
            }
          }}
          className="flex gap-2 mt-auto pt-3 border-t border-zinc-100"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={mode === 'conversation' ? 'Reply to Founder AI…' : 'Ask anything about your day…'}
            className="flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            disabled={loading || isTyping}
          />
          <button
            type="submit"
            disabled={loading || isTyping || !input.trim()}
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
