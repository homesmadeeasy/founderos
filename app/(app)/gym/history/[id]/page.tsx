'use client'

import Link from 'next/link'
import { useGymData } from '@/contexts/GymDataContext'
import { getProgressionForExercise } from '@/contexts/GymDataContext'
import GymCard from '@/components/gym/GymCard'

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const { sessions, profile } = useGymData()
  const session = sessions.find(s => s.id === params.id)

  if (!session) {
    return (
      <div className="p-6">
        <p className="text-sm text-zinc-500">Session not found.</p>
        <Link href="/gym/history" className="text-sm text-emerald-700 mt-2 inline-block">← History</Link>
      </div>
    )
  }

  return (
    <div className="home-page min-h-screen">
      <div className="home-canvas max-w-[720px] mx-auto px-4 py-5">
        <Link href="/gym/history" className="text-sm text-emerald-700 hover:underline">← History</Link>
        <h1 className="text-lg font-semibold text-zinc-900 mt-2">{session.title}</h1>
        <p className="text-xs text-zinc-500">{session.completedAt.slice(0, 16)}</p>

        {session.exercises.map(ex => {
          const prog = getProgressionForExercise(ex.exerciseId, ex.exerciseName, sessions, profile)
          const working = ex.sets.filter(s => s.completed && s.setType === 'working')
          const best = working.reduce<{ w: number; r: number } | null>((b, s) => {
            if (!b || s.weight * s.reps > b.w * b.r) return { w: s.weight, r: s.reps }
            return b
          }, null)
          return (
            <GymCard key={ex.plannedExerciseId ?? `${ex.exerciseId}-${ex.order}`} className="p-4 mt-4">
              <h3 className="text-sm font-semibold">{ex.exerciseName}</h3>
              <p className="text-xs text-zinc-500 mt-1">
                {working.map(s => `${s.weight}kg×${s.reps}${s.rpe ? ` RPE${s.rpe}` : ''}`).join(' · ')}
              </p>
              {best && <p className="text-xs text-zinc-600 mt-1">Best set: {best.w}kg × {best.r} reps</p>}
              <p className="text-xs text-emerald-800 mt-2">{prog.recommendation}</p>
              <p className="text-[10px] text-zinc-400">{prog.evidence}</p>
            </GymCard>
          )
        })}
      </div>
    </div>
  )
}
