'use client'

import Link from 'next/link'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useGymSnapshot } from '@/components/gym/useGymSnapshot'
import Card from '@/components/home/Card'

export default function GymHomeSummary() {
  const { domainIntelligence } = useMorningExecution()
  const snapshot = useGymSnapshot()

  const topDomain = domainIntelligence?.coordinator?.topDomain
  const healthRanked = domainIntelligence?.coordinator?.evaluations
    ?.findIndex(e => e.domainId === 'health') ?? -1
  const healthInTop = healthRanked >= 0 && healthRanked < 2
  if (topDomain !== 'health' && !healthInTop) return null

  return (
    <Card className="p-4 sm:p-5" delay={260}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80">Gym momentum</p>
        <Link href="/gym" className="text-[10px] text-emerald-600 hover:text-emerald-700">Gym AI →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl bg-emerald-50/50 border border-emerald-100/60 p-2.5">
          <p className="text-[9px] uppercase text-zinc-400 font-semibold">Today</p>
          <p className="text-xs font-medium text-zinc-800 mt-1 line-clamp-2">{snapshot.todaysWorkout.title}</p>
        </div>
        <div className="rounded-xl bg-emerald-50/50 border border-emerald-100/60 p-2.5">
          <p className="text-[9px] uppercase text-zinc-400 font-semibold">Recovery</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums">{snapshot.recoveryScore}</p>
        </div>
        <div className="rounded-xl bg-emerald-50/50 border border-emerald-100/60 p-2.5">
          <p className="text-[9px] uppercase text-zinc-400 font-semibold">Week</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums">{snapshot.sessionsThisWeek}</p>
        </div>
        <div className="rounded-xl bg-emerald-50/50 border border-emerald-100/60 p-2.5">
          <p className="text-[9px] uppercase text-zinc-400 font-semibold">Momentum</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums">{snapshot.momentumScore}</p>
        </div>
      </div>
    </Card>
  )
}
