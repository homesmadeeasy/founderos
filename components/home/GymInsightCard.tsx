'use client'

import Link from 'next/link'
import { Dumbbell } from 'lucide-react'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useGymSnapshot } from '@/components/gym/useGymSnapshot'
import Card from '@/components/home/Card'

export default function GymInsightCard() {
  const { domainIntelligence } = useMorningExecution()
  const snapshot = useGymSnapshot()

  const topDomain = domainIntelligence?.coordinator?.topDomain
  if (topDomain !== 'health') return null

  return (
    <Card className="p-4 sm:p-5 relative overflow-hidden" delay={280}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] via-transparent to-teal-500/[0.06] pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell size={14} className="text-emerald-600 shrink-0" />
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80">Gym AI</p>
          </div>
          <p className="text-sm text-zinc-800 leading-relaxed">{snapshot.mainInsight}</p>
          <p className="text-[11px] text-zinc-500 mt-2 line-clamp-2">{snapshot.topRecommendation}</p>
        </div>
        <Link
          href="/gym"
          className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700 transition-colors"
        >
          Open
        </Link>
      </div>
    </Card>
  )
}
