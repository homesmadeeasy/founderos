'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

const ACTION_LABEL: Record<string, string> = {
  maintain: 'Maintain',
  increase: 'Increase',
  reduce: 'Reduce',
  deload_consideration: 'Deload consideration',
  insufficient_data: 'Insufficient data',
}

interface Props {
  snapshot: GymSnapshot
}

export default function ProgressionCard({ snapshot }: Props) {
  const recs = snapshot.progressionRecommendations.slice(0, 4)
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-2">Progression</p>
      <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{snapshot.progressionScore}</p>
      <ul className="mt-3 space-y-2">
        {recs.length === 0 ? (
          <li className="text-sm text-zinc-500">Log weighted working sets to unlock progression guidance.</li>
        ) : recs.map(a => (
          <li key={a.exerciseId} className="text-xs text-zinc-600 leading-relaxed">
            <span className="font-medium text-zinc-800">{a.exerciseName}</span>
            <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-zinc-100 text-zinc-500">
              {ACTION_LABEL[a.action] ?? a.action}
            </span>
            <p className="mt-0.5">{a.recommendation}</p>
            {a.evidence && <p className="text-[10px] text-zinc-400 mt-0.5">{a.evidence}</p>}
          </li>
        ))}
      </ul>
    </GymCard>
  )
}
