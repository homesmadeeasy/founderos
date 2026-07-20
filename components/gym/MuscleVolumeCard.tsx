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
  insufficient_data: 'bg-zinc-200',
  below_baseline: 'bg-amber-400',
  within_baseline: 'bg-emerald-500',
  above_baseline: 'bg-orange-500',
}

interface Props {
  snapshot: GymSnapshot
}

export default function MuscleVolumeCard({ snapshot }: Props) {
  const shown = snapshot.weeklyVolume
    .filter(v => v.sets > 0 || v.status === 'insufficient_data')
    .slice(0, 8)

  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Weekly volume</p>
      {!snapshot.hasStructuredHistory ? (
        <p className="text-sm text-zinc-500">Insufficient data — complete a logged workout to see muscle workload.</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-zinc-500">No working sets logged this week.</p>
      ) : (
        <div className="space-y-2">
          {shown.map(v => (
            <div key={v.muscle} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[v.status] ?? STATUS_DOT.unknown}`} />
                <span className="text-zinc-800">{MUSCLE_GROUP_LABELS[v.muscle]}</span>
              </div>
              <span className="text-zinc-500 text-xs">
                {v.directSets != null ? `${v.directSets} direct` : `${v.sets} sets`}
                {v.secondarySets ? ` + ${v.secondarySets} sec` : ''}
                {' · '}{v.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-zinc-400 mt-2">Research ranges are contextual only — your logged history is primary.</p>
    </GymCard>
  )
}
