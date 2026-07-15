'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { GYM_GOAL_LABELS } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function GymGoalsCard({ snapshot }: Props) {
  const g = snapshot.goalProfile
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-2">Goals</p>
      <p className="text-lg font-semibold text-zinc-900">{GYM_GOAL_LABELS[g.primaryGoal]}</p>
      <p className="text-xs text-zinc-500 mt-2 capitalize">{g.experience} · {g.trainingDaysPerWeek} days / week target</p>
      <p className="text-sm text-zinc-600 mt-3">{snapshot.trainingBlock.focus}</p>
    </GymCard>
  )
}
