'use client'

import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import FounderCard from './FounderCard'

interface FounderRisksCardProps {
  snapshot: FounderSnapshot
}

const SEVERITY_STYLES = {
  high: 'bg-rose-50/80 text-rose-800 border-rose-200/60',
  medium: 'bg-amber-50/80 text-amber-800 border-amber-200/60',
  low: 'bg-zinc-50/80 text-zinc-600 border-zinc-200/60',
}

export default function FounderRisksCard({ snapshot }: FounderRisksCardProps) {
  if (snapshot.risks.length === 0) {
    return (
      <FounderCard className="p-4 sm:p-5" delay={360}>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-2">Risks</p>
        <p className="text-xs text-zinc-500">No major founder risks detected.</p>
      </FounderCard>
    )
  }

  return (
    <FounderCard className="p-4 sm:p-5" delay={360}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Risks</p>
      <div className="space-y-2.5">
        {snapshot.risks.map(risk => (
          <div key={risk.id} className="rounded-xl border border-white/70 bg-white/40 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${SEVERITY_STYLES[risk.severity]}`}>
                {risk.severity}
              </span>
              <p className="text-sm font-medium text-zinc-900">{risk.title}</p>
            </div>
            <p className="text-[11px] text-zinc-600 leading-relaxed">{risk.description}</p>
          </div>
        ))}
      </div>
    </FounderCard>
  )
}
