'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { GYM_GOAL_LABELS } from '@/lib/specialists/gym/gymTypes'

interface GymHeroProps {
  snapshot: GymSnapshot
}

export default function GymHero({ snapshot }: GymHeroProps) {
  return (
    <header className="text-center space-y-2">
      <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-emerald-500/80">Specialist</p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">Gym AI</h1>
      <p className="text-sm text-zinc-500 max-w-md mx-auto">
        Your personal strength coach — built from real workout evidence.
      </p>
      <p className="text-sm sm:text-base text-emerald-900/80 font-medium max-w-xl mx-auto pt-2 leading-relaxed">
        {snapshot.mainInsight}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <span className="px-2.5 py-1 rounded-full bg-white/70 border border-white/90 text-[10px] text-zinc-600 shadow-sm">
          Goal <strong className="text-zinc-900">{GYM_GOAL_LABELS[snapshot.goalProfile.primaryGoal]}</strong>
        </span>
        <span className="px-2.5 py-1 rounded-full bg-white/70 border border-white/90 text-[10px] text-zinc-600 shadow-sm">
          Momentum <strong className="text-emerald-700">{snapshot.momentumScore}</strong>
        </span>
        <span className="px-2.5 py-1 rounded-full bg-white/70 border border-white/90 text-[10px] text-zinc-600 shadow-sm capitalize">
          Recovery <strong className="text-amber-800">{snapshot.recoveryStatus.replace('_', ' ')}</strong>
        </span>
      </div>
    </header>
  )
}
