'use client'

import { useMemo } from 'react'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { getOutcomeStats } from '@/lib/outcome-engine/outcomeEngine'
import { generateHomeNarrative } from '@/lib/home/homeUtils'
import Card from './Card'

export default function NarrativeCard() {
  const { dailyContext, morningPlan, decisionOutput, domainIntelligence } = useMorningExecution()
  const outcomeStats = useMemo(() => getOutcomeStats(), [decisionOutput?.id])

  const narrative = useMemo(() => generateHomeNarrative({
    health: dailyContext?.healthSignals,
    coordinator: domainIntelligence?.coordinator,
    decision: decisionOutput,
    morningPlan,
    dailyContext,
    outcomeStats,
  }), [dailyContext, morningPlan, decisionOutput, domainIntelligence, outcomeStats])

  return (
    <Card className="p-4 sm:p-5 flex flex-col" delay={120}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Briefing</p>
      <div className="space-y-2.5 text-sm text-zinc-600 leading-relaxed font-light flex-1">
        {narrative.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </Card>
  )
}
