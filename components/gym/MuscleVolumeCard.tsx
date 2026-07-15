'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { MUSCLE_GROUP_LABELS } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

const STATUS_DOT: Record<string, string> = {
  optimal: 'bg-emerald-500',
  low: 'bg-amber-400',
  high: 'bg-orange-500',
  recovering: 'bg-sky-400',
  neglected: 'bg-zinc-300',
  unknown: 'bg-zinc-200',
}

interface Props {
  snapshot: GymSnapshot
}

export default function MuscleVolumeCard({ snapshot }: Props) {
  const shown = snapshot.weeklyVolume.filter(v => v.sets > 0 || v.status === 'neglected').slice(0, 8)
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Weekly volume</p>
      <div className="space-y-2">
        {shown.length === 0 ? (
          <p className="text-sm text-zinc-500">Log workouts to see muscle volume.</p>
        ) : shown.map(v => (
          <div key={v.muscle} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[v.status]}`} />
              <span className="text-zinc-800">{MUSCLE_GROUP_LABELS[v.muscle]}</span>
            </div>
            <span className="text-zinc-500 text-xs">{v.sets} sets · {v.status}</span>
          </div>
        ))}
      </div>
    </GymCard>
  )
}
