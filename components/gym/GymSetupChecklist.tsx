'use client'

import { useGymData } from '@/contexts/GymDataContext'
import { buildSetupChecklist } from '@/lib/specialists/gym/gymProfileUtils'
import GymCard from './GymCard'
import { Check, Circle } from 'lucide-react'

export default function GymSetupChecklist() {
  const { profile, completedSessions } = useGymData()
  const items = buildSetupChecklist(profile, completedSessions.length)

  return (
    <GymCard className="p-4">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-2">Setup checklist</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            {item.done
              ? <Check size={14} className="text-emerald-600 shrink-0" />
              : <Circle size={14} className="text-zinc-300 shrink-0" />}
            <span className={item.done ? 'text-zinc-600' : 'text-zinc-800'}>{item.label}</span>
          </li>
        ))}
      </ul>
    </GymCard>
  )
}
