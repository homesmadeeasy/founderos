'use client'

import Link from 'next/link'
import { Brain } from 'lucide-react'
import { useCognitiveInsight } from '@/contexts/CognitiveModelContext'
import Card from '@/components/home/Card'

export default function CognitiveInsightCard() {
  const insight = useCognitiveInsight()

  return (
    <Card className="p-4 sm:p-5 relative overflow-hidden" delay={180}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] via-transparent to-violet-500/[0.05] pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-indigo-600 shrink-0" />
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-indigo-600/80">Founder AI Mind</p>
          </div>
          <Link
            href="/founder"
            className="shrink-0 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 transition-colors"
          >
            Talk
          </Link>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-[11px]">
          <div>
            <dt className="text-zinc-400 font-medium uppercase tracking-wide text-[9px]">Current belief</dt>
            <dd className="text-zinc-800 mt-0.5 leading-snug line-clamp-2">{insight.currentBelief}</dd>
          </div>
          <div>
            <dt className="text-zinc-400 font-medium uppercase tracking-wide text-[9px]">Biggest unknown</dt>
            <dd className="text-zinc-700 mt-0.5 leading-snug line-clamp-2">{insight.biggestUnknown}</dd>
          </div>
          <div>
            <dt className="text-zinc-400 font-medium uppercase tracking-wide text-[9px]">Highest risk</dt>
            <dd className="text-zinc-700 mt-0.5 leading-snug line-clamp-2">{insight.highestRisk}</dd>
          </div>
          <div>
            <dt className="text-zinc-400 font-medium uppercase tracking-wide text-[9px]">Question I most want answered</dt>
            <dd className="text-zinc-800 mt-0.5 leading-snug line-clamp-2 font-medium">{insight.topQuestion}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}
