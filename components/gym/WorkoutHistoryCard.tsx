'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function WorkoutHistoryCard({ snapshot }: Props) {
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">History</p>
      {snapshot.recentSessions.length === 0 ? (
        <p className="text-sm text-zinc-500">No workout sessions in Memory, Objects, or Signals yet.</p>
      ) : (
        <ul className="space-y-2">
          {snapshot.recentSessions.slice(0, 5).map(s => (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-zinc-800 truncate">{s.title}</span>
              <span className="text-xs text-zinc-400 shrink-0 ml-2">
                {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GymCard>
  )
}
