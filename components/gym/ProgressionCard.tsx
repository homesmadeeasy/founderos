'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { buildProgressionAdvice } from '@/lib/specialists/gym/gymProgression'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function ProgressionCard({ snapshot }: Props) {
  const advice = buildProgressionAdvice(snapshot.strengthEstimates).slice(0, 4)
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-2">Progression</p>
      <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{snapshot.progressionScore}</p>
      <ul className="mt-3 space-y-2">
        {advice.length === 0 ? (
          <li className="text-sm text-zinc-500">Log weighted sets to track progression.</li>
        ) : advice.map(a => (
          <li key={a.exerciseId} className="text-xs text-zinc-600 leading-relaxed">
            <span className="font-medium text-zinc-800">{a.exerciseName}:</span> {a.recommendation}
          </li>
        ))}
      </ul>
    </GymCard>
  )
}
