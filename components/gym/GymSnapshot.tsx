'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'

interface GymSnapshotProps {
  snapshot: GymSnapshot
}

export default function GymSnapshotPanel({ snapshot }: GymSnapshotProps) {
  const metrics = [
    { label: 'Recovery', value: snapshot.recoveryScore },
    { label: 'Volume', value: snapshot.volumeScore },
    { label: 'Progression', value: snapshot.progressionScore },
    { label: 'Consistency', value: snapshot.consistencyScore },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {metrics.map(m => (
        <div key={m.label} className="rounded-xl border border-white/80 bg-gradient-to-br from-emerald-500/8 to-teal-500/4 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">{m.label}</p>
          <p className="text-2xl font-semibold text-zinc-900 mt-1 tabular-nums">{m.value}</p>
        </div>
      ))}
    </div>
  )
}
