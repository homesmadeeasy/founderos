'use client'

import { GymDataProvider } from '@/contexts/GymDataContext'
import GymProfileEditor from '@/components/gym/GymProfileEditor'

export default function GymSettingsSection() {
  return (
    <GymDataProvider>
      <section className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Gym profile</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Training goals, equipment, and load increments</p>
        </div>
        <div className="px-5 py-4">
          <GymProfileEditor />
        </div>
      </section>
    </GymDataProvider>
  )
}
