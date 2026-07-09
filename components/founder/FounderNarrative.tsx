'use client'

import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import FounderCard from './FounderCard'

interface FounderNarrativeProps {
  snapshot: FounderSnapshot
}

export default function FounderNarrative({ snapshot }: FounderNarrativeProps) {
  return (
    <FounderCard className="p-4 sm:p-5" delay={80}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Briefing</p>
      <div className="space-y-3 text-sm text-zinc-600 leading-relaxed font-light">
        {snapshot.narrative.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </FounderCard>
  )
}
