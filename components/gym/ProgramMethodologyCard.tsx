'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function ProgramMethodologyCard({ snapshot }: Props) {
  const summary = snapshot.todaysWorkout.researchSummary
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80 mb-2">Program methodology</p>
      <p className="text-sm text-zinc-700 leading-relaxed">{summary.methodology}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
          {summary.evidenceInformedCount} evidence-informed
        </span>
        <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
          {summary.fallbackCount} fallback
        </span>
        <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
          Avg confidence {summary.averageConfidence}%
        </span>
      </div>
      <p className="text-[11px] text-zinc-500 mt-3">
        Approved sources: {summary.approvedSourceIds.length}. Plans use ranges and starting points — not single optimal numbers.
      </p>
    </GymCard>
  )
}
