'use client'

import { useMemo } from 'react'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { buildTodayTimeline } from '@/lib/home/homeTimeline'
import Card from './Card'

const MAX_ITEMS = 5

export default function TimelineCard() {
  const { morningPlan, decisionOutput } = useMorningExecution()
  const { todaySignals } = useSignalEngine()

  const items = useMemo(() => buildTodayTimeline({
    signals: todaySignals,
    morningPlan,
    decision: decisionOutput,
  }).slice(0, MAX_ITEMS), [todaySignals, morningPlan, decisionOutput])

  if (items.length === 0) {
    return (
      <Card className="p-4 sm:p-5" delay={180}>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-2">Today</p>
        <p className="text-xs text-zinc-500">Timeline compiles as events and priorities load.</p>
      </Card>
    )
  }

  return (
    <Card className="p-4 sm:p-5" delay={180}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Today</p>
      <div className="space-y-0">
        {items.map((item, index) => (
          <div key={item.id} className="flex gap-3 group">
            <div className="flex flex-col items-center w-10 shrink-0">
              <span className="text-[10px] font-medium text-zinc-400 tabular-nums leading-none">{item.time}</span>
              <div className={`w-2 h-2 rounded-full mt-1.5 ${item.accent} ring-[3px] ring-white/90 shadow-sm`} />
              {index < items.length - 1 && (
                <div className="w-px flex-1 bg-gradient-to-b from-zinc-200/80 to-transparent min-h-[1.25rem] mt-1" />
              )}
            </div>
            <div className="pb-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 leading-snug group-hover:text-indigo-900/80 transition-colors">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{item.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
