'use client'

import { useState } from 'react'
import { useGymData } from '@/contexts/GymDataContext'
import type { GymProfile } from '@/lib/specialists/gym/gymStorage/gymStorageTypes'
import GymCard from './GymCard'

interface Props {
  compact?: boolean
}

export default function GymProfileEditor({ compact }: Props) {
  const { profile, saveProfile } = useGymData()
  const [saved, setSaved] = useState(false)
  if (!profile) return null

  const update = (patch: Partial<GymProfile>) => {
    saveProfile(patch)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <GymCard className={`p-4 sm:p-5 ${compact ? '' : ''}`}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-2">Gym profile</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500">Days per week</label>
          <input type="number" min={1} max={7} value={profile.trainingDaysPerWeek}
            onChange={e => update({ trainingDaysPerWeek: Number(e.target.value) })}
            className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-xs text-zinc-500">Session duration (min)</label>
          <input type="number" value={profile.sessionDurationMinutes}
            onChange={e => update({ sessionDurationMinutes: Number(e.target.value) })}
            className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-xs text-zinc-500">Smallest increment (kg)</label>
          <input type="number" step={0.5} value={profile.smallestLoadIncrementKg}
            onChange={e => update({ smallestLoadIncrementKg: Number(e.target.value) })}
            className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-xs text-zinc-500">Tracking mode</label>
          <select value={profile.trackingMode} onChange={e => update({ trackingMode: e.target.value as GymProfile['trackingMode'] })}
            className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1">
            <option value="rpe">RPE</option>
            <option value="rir">RIR</option>
            <option value="simple">Simple</option>
          </select>
        </div>
      </div>
      {saved && <p className="text-xs text-emerald-600 mt-2">Saved</p>}
    </GymCard>
  )
}
