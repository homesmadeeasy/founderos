'use client'

import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'

interface ConversationHeroProps {
  snapshot: FounderSnapshot
}

export default function ConversationHero({ snapshot }: ConversationHeroProps) {
  return (
    <header className="text-center space-y-2 pb-2">
      <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-violet-500/80">Founder AI</p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">Today&apos;s strategic thinking</h1>
      <p className="text-sm sm:text-base text-indigo-900/75 font-medium max-w-xl mx-auto leading-relaxed">
        {snapshot.mainInsight}
      </p>
    </header>
  )
}
