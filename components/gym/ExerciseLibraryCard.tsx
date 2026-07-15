'use client'

import { GYM_EXERCISE_LIBRARY } from '@/lib/specialists/gym/gymExerciseLibrary'
import { MUSCLE_GROUP_LABELS } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

export default function ExerciseLibraryCard() {
  const preview = GYM_EXERCISE_LIBRARY.slice(0, 6)
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-3">Exercise library</p>
      <ul className="space-y-2">
        {preview.map(ex => (
          <li key={ex.id} className="text-sm flex justify-between gap-2">
            <span className="text-zinc-800">{ex.name}</span>
            <span className="text-xs text-zinc-400 shrink-0">{MUSCLE_GROUP_LABELS[ex.primaryMuscle]}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-zinc-400 mt-3">{GYM_EXERCISE_LIBRARY.length} exercises in library</p>
    </GymCard>
  )
}
