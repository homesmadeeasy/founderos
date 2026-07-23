'use client'

import { useState, useCallback } from 'react'
import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { GYM_QUESTION_CHIPS, answerGymQuestion } from '@/lib/specialists/gym/gymConversation'
import { useActionEngine } from '@/contexts/ActionEngineContext'
import { useIdentity } from '@/contexts/IdentityContext'
import { buildActionPreview } from '@/lib/action-engine/actionProposal'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
}

export default function GymConversationCard({ snapshot }: Props) {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(null)
  const [proposalPreview, setProposalPreview] = useState<string | null>(null)
  const { proposeAction, approveAction, rejectActionProposal } = useActionEngine()
  const { getViewForSpecialist } = useIdentity()

  const ask = useCallback((text: string) => {
    setPrompt(text)
    const hints = getViewForSpecialist('gym').narrativeHints
    setAnswer(answerGymQuestion(snapshot, text, hints))
  }, [snapshot, getViewForSpecialist])

  const proposeQuickWorkout = useCallback(async () => {
    const first = snapshot.todaysWorkout.exercises[0]
    if (!first) return
    const p = first.prescription
    const payload = {
      exerciseName: first.exerciseName,
      exerciseId: first.exerciseId,
      weight: 0,
      reps: p.targetReps,
      sets: p.sets,
      notes: `Completed ${snapshot.todaysWorkout.title}`,
    }
    const proposal = await proposeAction({
      type: 'WorkoutLogged',
      payload,
      title: `Log ${first.exerciseName}`,
      description: buildActionPreview('WorkoutLogged', payload),
      rationale: 'Log today\'s workout after approval.',
      source: 'gym-ai',
    })
    if (proposal) {
      setPendingProposalId(proposal.id)
      setProposalPreview(proposal.preview)
      setAnswer('Workout proposal ready. Approve below to update volume, progression, and recovery.')
    }
  }, [snapshot, proposeAction])

  const approvePending = useCallback(async () => {
    if (!pendingProposalId) return
    const result = await approveAction(pendingProposalId)
    setPendingProposalId(null)
    setProposalPreview(null)
    setAnswer(result.success
      ? 'Workout approved and logged. All subscribers refreshed via kernel events.'
      : `Failed to log workout: ${result.error ?? 'unknown error'}`)
  }, [pendingProposalId, approveAction])

  const rejectPending = useCallback(async () => {
    if (!pendingProposalId) return
    await rejectActionProposal(pendingProposalId)
    setPendingProposalId(null)
    setProposalPreview(null)
    setAnswer('Workout proposal dismissed.')
  }, [pendingProposalId, rejectActionProposal])

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
      {proposalPreview && pendingProposalId && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-emerald-600 mb-1">Action proposal</p>
          <pre className="text-xs text-zinc-700 whitespace-pre-wrap font-sans">{proposalPreview}</pre>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={approvePending} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white">
              Approve
            </button>
            <button type="button" onClick={rejectPending} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600">
              Dismiss
            </button>
          </div>
        </div>
      )}
      {!pendingProposalId && (
        <button
          type="button"
          onClick={proposeQuickWorkout}
          className="mt-3 text-xs font-medium text-emerald-700 hover:underline"
        >
          Propose logging today&apos;s workout
        </button>
      )}
    </GymCard>
  )
}
