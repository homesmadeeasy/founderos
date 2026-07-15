'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function RecoveryCard({ snapshot }: Props) {
  const statusColors: Record<string, string> = {
    ready: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    train_light: 'text-amber-700 bg-amber-50 border-amber-100',
    recover: 'text-orange-700 bg-orange-50 border-orange-100',
    deload: 'text-rose-700 bg-rose-50 border-rose-100',
  }
  const cls = statusColors[snapshot.recoveryStatus] ?? statusColors.ready

  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-2">Recovery</p>
      <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full border capitalize ${cls}`}>
        {snapshot.recoveryStatus.replace('_', ' ')}
      </span>
      <p className="text-3xl font-semibold text-zinc-900 mt-3 tabular-nums">{snapshot.recoveryScore}</p>
      <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{snapshot.topRecommendation}</p>
    </GymCard>
  )
}
