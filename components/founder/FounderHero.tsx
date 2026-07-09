'use client'

import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'

interface FounderHeroProps {
  snapshot: FounderSnapshot
}

export default function FounderHero({ snapshot }: FounderHeroProps) {
  return (
    <header className="text-center space-y-2">
      <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-violet-500/80">Specialist</p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">Founder AI</h1>
      <p className="text-sm text-zinc-500 max-w-md mx-auto">
        Your strategic co-founder for building, validating and shipping.
      </p>
      <p className="text-sm sm:text-base text-indigo-900/80 font-medium max-w-xl mx-auto pt-2 leading-relaxed">
        {snapshot.mainInsight}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <span className="px-2.5 py-1 rounded-full bg-white/70 border border-white/90 text-[10px] text-zinc-600 shadow-sm capitalize">
          Stage <strong className="text-zinc-900">{snapshot.currentStage}</strong>
        </span>
        <span className="px-2.5 py-1 rounded-full bg-white/70 border border-white/90 text-[10px] text-zinc-600 shadow-sm">
          Momentum <strong className="text-violet-700">{snapshot.momentumScore}</strong>
        </span>
        <span className="px-2.5 py-1 rounded-full bg-white/70 border border-white/90 text-[10px] text-zinc-600 shadow-sm">
          Bottleneck <strong className="text-amber-800">{snapshot.mainBottleneck}</strong>
        </span>
      </div>
    </header>
  )
}
