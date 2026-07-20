'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGymData } from '@/contexts/GymDataContext'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import type { ActiveWorkout } from '@/lib/specialists/gym/gymStorage/gymStorageTypes'
import {
  addSetToExercise,
  updateSet,
  removeSet,
} from '@/lib/specialists/gym/gymStorage/gymWorkoutService'
import { newGymId } from '@/lib/specialists/gym/gymStorage/gymStorageRepository'
import { activeExerciseListKey } from '@/lib/specialists/gym/gymPlannedExerciseUtils'
import { GYM_EXERCISE_LIBRARY } from '@/lib/specialists/gym/gymExerciseLibrary'
import GymCard from './GymCard'

export default function ActiveWorkoutLogger() {
  const router = useRouter()
  const { publish } = useFounderKernel()
  const { activeWorkout, saveActiveWorkout, finishWorkout, discardActiveWorkout, profile } = useGymData()
  const [showDiscard, setShowDiscard] = useState(false)
  const [completedSummary, setCompletedSummary] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [addingExercise, setAddingExercise] = useState(false)

  const workout = activeWorkout
  if (!workout) {
    return (
      <GymCard className="p-5 text-center">
        <p className="text-sm text-zinc-500">No active workout. Approve and start today&apos;s session from the Gym home screen.</p>
        <Link href="/gym" className="text-sm text-emerald-700 mt-2 inline-block hover:underline">← Back to Gym</Link>
      </GymCard>
    )
  }

  const persist = useCallback((next: ActiveWorkout) => {
    saveActiveWorkout(next)
  }, [saveActiveWorkout])

  const handleSetChange = (exerciseId: string, setId: string, field: string, value: number | boolean) => {
    persist(updateSet(workout, exerciseId, setId, { [field]: value }))
    void publish({ type: 'SetUpdated', source: 'gym-ai', payload: { exerciseId, setId, field } })
  }

  const handleCompleteSet = (exerciseId: string, setId: string) => {
    const next = updateSet(workout, exerciseId, setId, { completed: true })
    persist(next)
    void publish({ type: 'SetLogged', source: 'gym-ai', payload: { exerciseId, setId } })
  }

  const handleAddSet = (exerciseId: string) => {
    persist(addSetToExercise(workout, exerciseId))
  }

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    persist(removeSet(workout, exerciseId, setId))
  }

  const handleSkipExercise = (exerciseId: string) => {
    persist({
      ...workout,
      exercises: workout.exercises.map(ex =>
        ex.exerciseId === exerciseId ? { ...ex, skipped: true } : ex,
      ),
    })
  }

  const handleAddExercise = (exerciseId: string, name: string) => {
    const order = workout.exercises.length + 1
    const occurrence = workout.exercises.filter(e => e.exerciseId === exerciseId).length + 1
    persist({
      ...workout,
      exercises: [
        ...workout.exercises,
        {
          plannedExerciseId: `${workout.id}::${exerciseId}::${occurrence}`,
          exerciseId,
          exerciseName: name,
          order,
          sets: [{
            id: newGymId(),
            setNumber: 1,
            setType: 'working' as const,
            reps: 8,
            weight: 0,
            completed: false,
          }],
          notes: '',
        },
      ],
    })
    setAddingExercise(false)
    setSearch('')
  }

  const handleComplete = () => {
    const result = finishWorkout()
    if (result) setCompletedSummary(result.summary)
  }

  const filtered = GYM_EXERCISE_LIBRARY.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()),
  ).slice(0, 8)

  const tracking = profile?.trackingMode ?? 'rpe'

  if (completedSummary) {
    return (
      <GymCard className="p-5">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600 mb-2">Workout complete</p>
        <p className="text-sm text-zinc-700">{completedSummary}</p>
        <Link href="/gym" className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline">Back to Gym →</Link>
      </GymCard>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      <GymCard className="p-4 sticky top-0 z-10 bg-white/90">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{workout.title}</h2>
            <p className="text-xs text-zinc-500">Active · auto-saved</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => persist(workout)}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200">Save</button>
            <button type="button" onClick={handleComplete}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white">Complete</button>
          </div>
        </div>
      </GymCard>

      {workout.exercises.filter(e => !e.skipped).map((ex, index) => (
        <GymCard key={activeExerciseListKey(ex, index)} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">{ex.exerciseName}</h3>
            <button type="button" onClick={() => handleSkipExercise(ex.exerciseId)}
              className="text-[10px] text-zinc-400 hover:text-zinc-600">Skip</button>
          </div>
          <div className="space-y-2">
            {ex.sets.map(set => (
              <div key={set.id} className={`grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center text-xs ${set.completed ? 'opacity-70' : ''}`}>
                <span className="text-zinc-400 w-6">#{set.setNumber}</span>
                <input type="number" placeholder="kg" value={set.weight || ''}
                  onChange={e => handleSetChange(ex.exerciseId, set.id, 'weight', Number(e.target.value))}
                  className="rounded border border-zinc-200 px-2 py-1.5" />
                <input type="number" placeholder="reps" value={set.reps || ''}
                  onChange={e => handleSetChange(ex.exerciseId, set.id, 'reps', Number(e.target.value))}
                  className="rounded border border-zinc-200 px-2 py-1.5" />
                {tracking === 'rpe' && (
                  <input type="number" placeholder="RPE" value={set.rpe ?? ''}
                    onChange={e => handleSetChange(ex.exerciseId, set.id, 'rpe', Number(e.target.value))}
                    className="rounded border border-zinc-200 px-2 py-1.5" />
                )}
                {tracking === 'rir' && (
                  <input type="number" placeholder="RIR" value={set.rir ?? ''}
                    onChange={e => handleSetChange(ex.exerciseId, set.id, 'rir', Number(e.target.value))}
                    className="rounded border border-zinc-200 px-2 py-1.5" />
                )}
                {tracking === 'simple' && <span className="text-zinc-300">—</span>}
                <div className="flex gap-1">
                  <button type="button" onClick={() => handleCompleteSet(ex.exerciseId, set.id)}
                    className={`px-2 py-1 rounded ${set.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100'}`}>✓</button>
                  <button type="button" onClick={() => handleRemoveSet(ex.exerciseId, set.id)}
                    className="px-2 py-1 rounded bg-zinc-50 text-zinc-400">×</button>
                </div>
                <label className="col-span-full flex items-center gap-1 text-[10px] text-amber-700">
                  <input type="checkbox" checked={set.painFlag ?? false}
                    onChange={e => handleSetChange(ex.exerciseId, set.id, 'painFlag', e.target.checked)} />
                  Pain or discomfort
                </label>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => handleAddSet(ex.exerciseId)}
            className="mt-2 text-xs text-emerald-700 hover:underline">+ Add set</button>
        </GymCard>
      ))}

      <GymCard className="p-4">
        <button type="button" onClick={() => setAddingExercise(!addingExercise)}
          className="text-sm font-medium text-emerald-700">+ Add exercise</button>
        {addingExercise && (
          <div className="mt-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search library…"
              className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2" />
            <ul className="mt-2 max-h-40 overflow-y-auto">
              {filtered.map(e => (
                <li key={e.id}>
                  <button type="button" onClick={() => handleAddExercise(e.id, e.name)}
                    className="text-sm w-full text-left px-2 py-1.5 hover:bg-zinc-50">{e.name}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </GymCard>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 border-t border-zinc-100 flex gap-2 justify-center">
        <button type="button" onClick={() => { persist(workout); router.push('/gym') }}
          className="text-sm px-4 py-2 rounded-lg border border-zinc-200">Save & exit</button>
        <button type="button" onClick={() => setShowDiscard(true)}
          className="text-sm px-4 py-2 rounded-lg text-red-600 border border-red-100">Discard</button>
      </div>

      {showDiscard && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <GymCard className="p-5 max-w-sm w-full">
            <p className="text-sm font-medium text-zinc-900">Discard this workout?</p>
            <p className="text-xs text-zinc-500 mt-1">All logged sets will be lost.</p>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => { discardActiveWorkout(); router.push('/gym') }}
                className="text-sm px-3 py-2 rounded-lg bg-red-600 text-white">Discard</button>
              <button type="button" onClick={() => setShowDiscard(false)}
                className="text-sm px-3 py-2 rounded-lg border border-zinc-200">Cancel</button>
            </div>
          </GymCard>
        </div>
      )}
    </div>
  )
}
