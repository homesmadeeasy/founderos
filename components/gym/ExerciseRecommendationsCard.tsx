'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function ExerciseRecommendationsCard({ snapshot }: Props) {
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Recommendations</p>
      <ul className="space-y-2">
        {snapshot.recommendations.length === 0 ? (
          <li className="text-sm text-zinc-500">Balanced selection — follow today&apos;s workout.</li>
        ) : snapshot.recommendations.map(r => (
          <li key={r.exerciseId} className="text-sm">
            <span className="font-medium text-zinc-800">{r.exerciseName}</span>
            <p className="text-xs text-zinc-500 mt-0.5">{r.reason}</p>
          </li>
        ))}
      </ul>
    </GymCard>
  )
}
