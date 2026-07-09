'use client'

import { useEffect, useState } from 'react'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { todayISO } from '@/lib/command-center/utils'
import {
  missionConfidenceLabel,
  missionImportanceLabel,
  missionSourceLabel,
} from '@/lib/home/homeUtils'
import Card from './Card'

export default function MissionCard() {
  const { state, setMission } = useCommandCenter()
  const { morningPlan, decisionOutput, updatePrimaryMission } = useMorningExecution()
  const today = todayISO()

  const ccMission = state.missionDate === today ? state.mission : ''
  const planMission = morningPlan?.primaryMission ?? ''
  const initial = ccMission || planMission

  const [draft, setDraft] = useState(initial)

  useEffect(() => {
    setDraft(ccMission || planMission)
  }, [ccMission, planMission])

  function save() {
    const trimmed = draft.trim()
    setMission(trimmed)
    if (morningPlan) updatePrimaryMission(trimmed)
  }

  return (
    <Card className="p-4 sm:p-5 flex flex-col" delay={80}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Mission</p>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save() }}
        placeholder="What must happen today?"
        className="w-full text-lg sm:text-xl font-medium text-zinc-900 bg-transparent border-0 border-b border-zinc-200/70 pb-2.5 focus:outline-none focus:border-indigo-300/80 placeholder:text-zinc-300 transition-colors"
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-[11px] text-zinc-500">
        <span>Confidence <strong className="text-zinc-800">{missionConfidenceLabel(decisionOutput)}</strong></span>
        <span className="hidden sm:inline w-px h-3 bg-zinc-200" />
        <span>Importance <strong className="text-zinc-800">{missionImportanceLabel(decisionOutput)}</strong></span>
        <span className="hidden sm:inline w-px h-3 bg-zinc-200" />
        <span>Source <strong className="text-zinc-800">{missionSourceLabel(morningPlan)}</strong></span>
      </div>
    </Card>
  )
}
