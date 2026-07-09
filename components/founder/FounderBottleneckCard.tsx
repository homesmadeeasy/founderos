'use client'

import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import FounderCard from './FounderCard'

interface FounderBottleneckCardProps {
  snapshot: FounderSnapshot
}

export default function FounderBottleneckCard({ snapshot }: FounderBottleneckCardProps) {
  return (
    <FounderCard className="p-4 sm:p-5 relative overflow-hidden" delay={280}>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.04] via-transparent to-rose-500/[0.04] pointer-events-none" />
      <div className="relative">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-amber-700/80 mb-2">Main bottleneck</p>
        <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
          {snapshot.mainBottleneck}
        </h2>
        <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{snapshot.topRecommendation}</p>
        {snapshot.ignoreToday.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/60">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Ignore today</p>
            <ul className="space-y-1">
              {snapshot.ignoreToday.map(item => (
                <li key={item} className="text-[11px] text-zinc-500">· {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </FounderCard>
  )
}
