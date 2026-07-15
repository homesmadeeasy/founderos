'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { MUSCLE_GROUP_LABELS } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function TodaysWorkoutCard({ snapshot }: Props) {
  const w = snapshot.todaysWorkout
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80 mb-2">Today&apos;s workout</p>
      <h3 className="text-lg font-semibold text-zinc-900">{w.title}</h3>
      <p className="text-xs text-zinc-500 mt-1">~{w.estimatedMinutes} min · {w.musclesTrained.map(m => MUSCLE_GROUP_LABELS[m]).join(', ')}</p>
      <ul className="mt-4 space-y-2">
        {w.exercises.map(ex => (
          <li key={ex.exerciseId} className="flex items-start justify-between gap-2 text-sm">
            <span className="text-zinc-800">{ex.exerciseName}</span>
            <span className="text-zinc-500 text-xs shrink-0">{ex.sets}×{ex.reps} · RPE {ex.targetRpe}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">{w.rationale}</p>
    </GymCard>
  )
}
