'use client'

import { useState } from 'react'
import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import { FOUNDER_QUESTION_CHIPS, answerFounderQuestion } from '@/lib/specialists/founder/founderQuestions'
import FounderCard from './FounderCard'

interface FounderQuestionsCardProps {
  snapshot: FounderSnapshot
}

export default function FounderQuestionsCard({ snapshot }: FounderQuestionsCardProps) {
  const [activeAnswer, setActiveAnswer] = useState<string | null>(null)
  const [activeLabel, setActiveLabel] = useState<string | null>(null)

  function handleAsk(prompt: string, label: string) {
    setActiveLabel(label)
    setActiveAnswer(answerFounderQuestion(snapshot, prompt))
  }

  return (
    <FounderCard className="p-4 sm:p-5" delay={440}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Ask Founder</p>
      <div className="flex flex-wrap gap-2">
        {FOUNDER_QUESTION_CHIPS.map(chip => (
          <button
            key={chip.id}
            type="button"
            onClick={() => handleAsk(chip.prompt, chip.label)}
            className={[
              'px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors',
              activeLabel === chip.label
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200/80'
                : 'bg-white/60 text-zinc-600 border-white/90 hover:bg-white/90 hover:text-zinc-800',
            ].join(' ')}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {activeAnswer && (
        <div className="mt-4 pt-4 border-t border-white/60 space-y-2 text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
          {activeAnswer.split('\n\n').map((block, i) => (
            <p key={i}>{block.replace(/\*\*/g, '')}</p>
          ))}
        </div>
      )}
    </FounderCard>
  )
}
