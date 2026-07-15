'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function WeaknessCard({ snapshot }: Props) {
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Weaknesses</p>
      {snapshot.weaknesses.length === 0 ? (
        <p className="text-sm text-zinc-500">No major imbalances detected from logged data.</p>
      ) : (
        <ul className="space-y-2">
          {snapshot.weaknesses.map(w => (
            <li key={w.id} className="rounded-lg bg-zinc-50/80 px-3 py-2">
              <p className="text-sm font-medium text-zinc-800">{w.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{w.description}</p>
            </li>
          ))}
        </ul>
      )}
    </GymCard>
  )
}
