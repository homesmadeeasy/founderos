'use client'

import { useState, useCallback } from 'react'
import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { GYM_QUESTION_CHIPS, answerGymQuestion } from '@/lib/specialists/gym/gymConversation'
import { useIntelligencePipeline } from '@/contexts/IntelligencePipelineContext'
import { useIdentity } from '@/contexts/IdentityContext'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function GymConversationCard({ snapshot }: Props) {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const { run } = useIntelligencePipeline()
  const { ingestSignals } = useIdentity()

  const ask = useCallback(async (text: string) => {
    setPrompt(text)
    const result = await run(
      { specialistId: 'gym', question: text, conversationContext: 'gym-ai' },
      {
        produceResponse: (partial) =>
          answerGymQuestion(snapshot, text, partial.identityHints, partial.realityHints),
        onIdentityObservation: async () => {
          await ingestSignals([{
            id: `gym-ask-${Date.now()}`,
            domain: 'training',
            signalType: 'conversation_turn',
            occurredAt: new Date().toISOString(),
            payload: { question: text.slice(0, 120) },
          }])
        },
      },
    )
    setAnswer(result.response)
  }, [snapshot, run, ingestSignals])




  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80 mb-2">Gym AI</p>
      <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
        Ask about today&apos;s plan. To train, use <span className="font-medium text-zinc-700">Approve &amp; start</span> on the workout card — that opens the Active Workout logger. Chat never marks a workout completed.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {GYM_QUESTION_CHIPS.slice(0, 6).map(chip => (
          <button
            key={chip.id}
            type="button"
            onClick={() => { void ask(chip.prompt) }}
            className="text-[10px] px-2 py-1 rounded-full border border-emerald-100 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/80 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) void ask(prompt.trim()) }}
        className="flex gap-2"
      >
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ask Gym AI…"
          className="flex-1 text-sm rounded-lg border border-zinc-200 px-3 py-2 bg-white/80"
        />
        <button type="submit" className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
          Ask
        </button>
      </form>
      {answer && (
        <div className="mt-3 text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed rounded-lg bg-zinc-50/80 p-3">
          {answer}
        </div>
      )}
    </GymCard>
  )
}
