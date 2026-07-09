'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, X, HelpCircle } from 'lucide-react'
import { useConversation } from '@/contexts/ConversationContext'
import { getProactiveHomeMessage } from '@/lib/conversation/conversationEngine'
import { useFounderInput } from '@/components/founder/useFounderInput'
import { useUserDisplayName } from '@/components/founder/useFounderInput'
import EvidenceChips from '@/components/conversation/EvidenceChips'
import Card from './Card'

export default function FounderConversationPrompt() {
  const router = useRouter()
  const founderInput = useFounderInput()
  const userName = useUserDisplayName()
  const { dismissProactive, start, proactiveDismissed } = useConversation()
  const [showWhy, setShowWhy] = useState(false)

  const proactive = getProactiveHomeMessage(founderInput, userName)

  if (proactiveDismissed) return null

  const paragraphs = proactive.message.split('\n\n')
  const body = paragraphs.slice(0, -1).join('\n\n')
  const question = paragraphs[paragraphs.length - 1] ?? proactive.question

  return (
    <Card className="p-4 sm:p-5 flex flex-col relative" delay={120}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
            FA
          </div>
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-violet-600">Founder AI says</p>
        </div>
        <button
          type="button"
          onClick={dismissProactive}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/80 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2.5 text-sm text-zinc-700 leading-relaxed font-light flex-1">
        {body.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        {question && (
          <p className="text-zinc-900 font-medium pt-1">{question}</p>
        )}
      </div>

      {showWhy && (
        <div className="mt-3 pt-3 border-t border-white/80">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-zinc-400 mb-2">Evidence</p>
          <EvidenceChips evidence={proactive.evidence} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4 pt-1">
        <button
          type="button"
          onClick={() => { start(); router.push('/founder') }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm hover:bg-zinc-800 transition-colors"
        >
          <MessageCircle size={14} />
          Talk
        </button>
        <button
          type="button"
          onClick={dismissProactive}
          className="px-4 py-2 rounded-xl border border-zinc-200/80 bg-white/50 text-sm text-zinc-600 hover:bg-white/80 transition-colors"
        >
          Ignore
        </button>
        <button
          type="button"
          onClick={() => setShowWhy(v => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200/80 bg-white/50 text-sm text-zinc-600 hover:bg-white/80 transition-colors"
        >
          <HelpCircle size={14} />
          Why?
        </button>
      </div>
    </Card>
  )
}
