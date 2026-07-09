'use client'

import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import FounderCard from './FounderCard'

interface FounderHealthCardProps {
  snapshot: FounderSnapshot
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-700'
  if (score >= 45) return 'text-amber-700'
  return 'text-rose-700'
}

export default function FounderHealthCard({ snapshot }: FounderHealthCardProps) {
  return (
    <section className="space-y-3">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 px-0.5">Company health</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
        {snapshot.healthMetrics.map((m, i) => (
          <FounderCard key={m.id} className="p-3 sm:p-3.5" delay={120 + i * 30}>
            <p className="text-[10px] font-semibold text-zinc-500">{m.label}</p>
            <p className={`text-2xl font-semibold tabular-nums mt-1 ${scoreColor(m.score)}`}>{m.score}</p>
            <p className="text-[10px] text-zinc-500 mt-1.5 leading-snug line-clamp-2">{m.sentence}</p>
          </FounderCard>
        ))}
      </div>
    </section>
  )
}
