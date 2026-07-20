'use client'

import Link from 'next/link'
import { useGymData } from '@/contexts/GymDataContext'
import { WORKOUT_STATUS_LABELS, normalizeWorkoutStatus } from '@/lib/specialists/gym/gymSessionStatus'
import GymCard from '@/components/gym/GymCard'

export default function GymHistoryPage() {
  const { sessions } = useGymData()
  const visible = sessions.filter(s =>
    s.status === 'completed' || s.status === 'skipped' || s.status === 'cancelled' || s.status === 'planned',
  )

  const byDate = visible.reduce<Record<string, typeof visible>>((acc, s) => {
    const day = (s.scheduledFor ?? s.completedAt ?? s.date).slice(0, 10)
    if (!acc[day]) acc[day] = []
    acc[day].push(s)
    return acc
  }, {})

  const days = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="home-page min-h-screen">
      <div className="home-canvas max-w-[720px] mx-auto px-4 py-5 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-zinc-900">Workout history</h1>
          <Link href="/gym" className="text-sm text-emerald-700 hover:underline">← Gym</Link>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Only Completed sessions affect volume and progression. Planned, Skipped, and Cancelled are honesty records.
        </p>

        {days.length === 0 ? (
          <GymCard className="p-5 text-center">
            <p className="text-sm text-zinc-500">No workouts yet. Log your first completed session to build history.</p>
          </GymCard>
        ) : days.map(day => (
          <div key={day} className="mb-4">
            <p className="text-xs font-semibold text-zinc-400 mb-2">{day}</p>
            {byDate[day].map(session => {
              const status = normalizeWorkoutStatus(session)
              return (
                <GymCard key={session.id} className="p-4 mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">{session.title}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {WORKOUT_STATUS_LABELS[status]}
                        {status === 'completed' && session.totalVolumeKg ? ` · ${session.totalVolumeKg} kg volume` : ''}
                        {status === 'skipped' && session.skipReason ? ` · ${session.skipReason}` : ''}
                      </p>
                    </div>
                    {status === 'completed' && (
                      <Link href={`/gym/history/${session.id}`} className="text-xs text-emerald-700 hover:underline">Details</Link>
                    )}
                  </div>
                </GymCard>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
