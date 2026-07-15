'use client'

import { useState, useCallback } from 'react'
import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { GYM_QUESTION_CHIPS, answerGymQuestion } from '@/lib/specialists/gym/gymConversation'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { buildWorkoutLogMemory } from '@/lib/specialists/gym/gymWorkoutLogger'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function GymConversationCard({ snapshot }: Props) {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const { publish } = useFounderKernel()
  const { createMemory } = useMemoryEngine()

  const ask = useCallback((text: string) => {
    setPrompt(text)
    setAnswer(answerGymQuestion(snapshot, text))
    void publish({ type: 'UserAskedQuestion', source: 'gym-ai', payload: { question: text.slice(0, 80) } })
  }, [snapshot, publish])

  const logQuickWorkout = useCallback(() => {
    const first = snapshot.todaysWorkout.exercises[0]
    if (!first) return
    const mem = buildWorkoutLogMemory({
      exercises: [{
        exerciseId: first.exerciseId,
        exerciseName: first.exerciseName,
        sets: [{ setNumber: 1, reps: parseInt(first.reps, 10) || 8, weight: 0, completed: true }],
      }],
      notes: `Completed ${snapshot.todaysWorkout.title}`,
    })
    createMemory(mem)
    void publish({ type: 'WorkoutLogged', source: 'gym-ai', payload: { title: snapshot.todaysWorkout.title } })
    void publish({ type: 'WeeklyVolumeUpdated', source: 'gym-ai', payload: { muscle: first.primaryMuscle } })
    setAnswer('Workout logged to Memory. Refresh to update volume and progression.')
  }, [snapshot, createMemory, publish])

  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80 mb-2">Gym AI</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {GYM_QUESTION_CHIPS.slice(0, 6).map(chip => (
          <button
            key={chip.id}
            type="button"
            onClick={() => ask(chip.prompt)}
            className="text-[10px] px-2 py-1 rounded-full border border-emerald-100 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/80 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) ask(prompt.trim()) }}
        className="flex gap-2"
      >
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ask Gym AI…"
          className="flex-1 text-sm rounded-lg border border-zinc-200 px-3 py-2 bg-white/80"
        />
        <button type="submit" className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
          Ask
        </button>
      </form>
      {answer && (
        <div className="mt-3 text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed rounded-lg bg-zinc-50/80 p-3">
          {answer}
        </div>
      )}
      <button
        type="button"
        onClick={logQuickWorkout}
        className="mt-3 text-xs font-medium text-emerald-700 hover:underline"
      >
        Log today&apos;s workout to Memory
      </button>
    </GymCard>
  )
}
