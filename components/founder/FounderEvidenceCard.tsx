'use client'

import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import FounderCard from './FounderCard'

interface FounderEvidenceCardProps {
  snapshot: FounderSnapshot
}

export default function FounderEvidenceCard({ snapshot }: FounderEvidenceCardProps) {
  if (snapshot.evidence.length === 0) return null

  return (
    <FounderCard className="p-4 sm:p-5" delay={400}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Evidence</p>
      <ul className="space-y-2">
        {snapshot.evidence.map(e => (
          <li key={e.id} className="flex gap-2.5 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${e.supports ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <div className="min-w-0">
              <p className="font-medium text-zinc-800">{e.title}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{e.summary}</p>
            </div>
          </li>
        ))}
      </ul>
    </FounderCard>
  )
}
