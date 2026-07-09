'use client'

import { useEffect, useMemo, useState } from 'react'
import { Cloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { getOutcomeStats } from '@/lib/outcome-engine/outcomeEngine'
import {
  computeDailySuccessProbability,
  computeRecoveryScore,
  displayNameFromEmail,
  formatCurrentDate,
  formatCurrentTime,
  getTimeOfDayGreeting,
} from '@/lib/home/homeUtils'

export default function HomeHero() {
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  const { todayLog } = useCommandCenter()
  const { dailyContext, decisionOutput } = useMorningExecution()
  const outcomeStats = useMemo(() => getOutcomeStats(), [])

  const health = dailyContext?.healthSignals ?? (todayLog ? {
    sleepHours: todayLog.sleepHours,
    workoutCompleted: todayLog.workoutCompleted,
  } : null)
  const recovery = computeRecoveryScore(health)
  const successProb = computeDailySuccessProbability(decisionOutput, outcomeStats)
  const name = displayNameFromEmail(userEmail)

  return (
    <header className="text-center space-y-1.5">
      <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-zinc-400/90">
        {formatCurrentTime()}
      </p>
      <h1 className="text-2xl sm:text-[1.75rem] font-semibold tracking-tight text-zinc-900">
        {getTimeOfDayGreeting()}, {name}
      </h1>
      <p className="text-xs text-zinc-500">{formatCurrentDate()}</p>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 border border-white/90 text-[11px] text-zinc-600 shadow-[0_1px_6px_rgba(99,102,241,0.06)]">
          <Cloud size={12} className="text-sky-500" />
          Clear · 22°
        </span>
        <span className="px-2.5 py-1 rounded-full bg-white/70 border border-white/90 text-[11px] text-zinc-600 shadow-[0_1px_6px_rgba(99,102,241,0.06)]">
          Recovery <strong className="text-zinc-900">{recovery}</strong>
        </span>
        <span className="px-2.5 py-1 rounded-full bg-white/70 border border-white/90 text-[11px] text-zinc-600 shadow-[0_1px_6px_rgba(99,102,241,0.06)]">
          Success <strong className="text-indigo-600">{successProb}%</strong>
        </span>
      </div>
    </header>
  )
}
