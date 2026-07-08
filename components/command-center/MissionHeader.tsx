'use client'

import { useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import { formatDisplayDate, greetingForHour, todayISO } from '@/lib/command-center/utils'

export default function MissionHeader() {
  const { state, setMission } = useCommandCenter()
  const today = todayISO()
  const mission = state.missionDate === today ? state.mission : ''
  const [draft, setDraft] = useState(mission)

  useEffect(() => {
    setDraft(mission)
  }, [mission])

  function save() {
    setMission(draft.trim())
  }

  return (
    <header className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">AI Command Center</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            {greetingForHour()}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">{formatDisplayDate()}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-zinc-300">
            <Target size={12} />
            AscendOS → FounderOS
          </span>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="mission" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Today&apos;s Mission
        </label>
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <input
            id="mission"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            placeholder="What must happen today for this day to count?"
            className="flex-1 rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          <button
            type="button"
            onClick={save}
            className="px-4 py-3 rounded-xl bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 transition-colors shrink-0"
          >
            Set mission
          </button>
        </div>
      </div>
    </header>
  )
}
