'use client'

import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import FounderCard from './FounderCard'

interface FounderRoadmapCardProps {
  snapshot: FounderSnapshot
}

export default function FounderRoadmapCard({ snapshot }: FounderRoadmapCardProps) {
  return (
    <FounderCard className="p-4 sm:p-5" delay={480}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Roadmap</p>
      <ol className="space-y-2">
        {snapshot.roadmap.map((step, i) => (
          <li key={step} className="flex gap-3 text-xs text-zinc-700">
            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </FounderCard>
  )
}
