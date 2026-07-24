'use client'

import { useState, useCallback } from 'react'
import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { GYM_QUESTION_CHIPS } from '@/lib/specialists/gym/gymConversation'
import {
  answerGymWithIntelligence,
  collectGymDomainEvidence,
  declaredProfileFromGymIdentity,
  gymReadinessFromSources,
  inferGymIntent,
  observedIdentityFromGym,
} from '@/lib/specialists/gym/gymIntelligence'
import { useIntelligencePipeline } from '@/contexts/IntelligencePipelineContext'
import { useIdentity } from '@/contexts/IdentityContext'
import { useGymData } from '@/contexts/GymDataContext'
import GymCard from './GymCard'
import Link from 'next/link'

interface Props {
  snapshot: GymSnapshot
}

export default function GymConversationCard({ snapshot }: Props) {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [lastRequestId, setLastRequestId] = useState<string | null>(null)
  const { run } = useIntelligencePipeline()
  const { ingestSignals, getViewForSpecialist } = useIdentity()
  const { profile, completedSessions } = useGymData()

  const ask = useCallback(async (text: string) => {
    setPrompt(text)
    const identity = getViewForSpecialist('gym')
    const domain = collectGymDomainEvidence(snapshot)
    const declaredProfile = declaredProfileFromGymIdentity(identity, profile)
    const observedIdentity = observedIdentityFromGym(identity)
    const readiness = gymReadinessFromSources({
      profile,
      identity,
      hasStructuredHistory: snapshot.hasStructuredHistory,
      completedWorkoutCount: completedSessions.length,
    })
    const requestId = `gym-${Date.now()}`
    setLastRequestId(requestId)
    const result = await run(
      {
        requestId,
        specialist: 'gym',
        userMessage: text,
        conversationContext: 'gym-home',
        intent: inferGymIntent(text),
        permittedDataScopes: ['identity', 'reality', 'memory', 'beliefs', 'domain_evidence'],
      },
      {
        declaredProfile,
        observedIdentity,
        domainEvidence: domain.evidence,
        constraints: domain.constraints,
        goals: domain.goals,
        readiness,
        followUpQuestion: readiness === 'evidence_rich'
          ? undefined
          : (domain.followUpQuestion ?? 'What equipment or injuries should I account for next time?'),
        produceResponse: (partial) => answerGymWithIntelligence(snapshot, text, partial),
        onIdentityObservation: async () => {
          await ingestSignals([{
            id: requestId,
            domain: 'training',
            signalType: 'conversation_turn',
            occurredAt: new Date().toISOString(),
            payload: { question: text.slice(0, 120), readiness },
          }])
        },
      },
    )
    setAnswer(result.response)
  }, [snapshot, run, ingestSignals, getViewForSpecialist, profile, completedSessions])

  return (
    <GymCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80">Gym AI</p>
        {process.env.NODE_ENV !== 'production' && (
          <Link
            href="/intelligence-inspector"
            className="text-[10px] text-zinc-400 hover:text-zinc-600 underline"
          >
            Inspector{lastRequestId ? ` · ${lastRequestId.slice(0, 12)}` : ''}
          </Link>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
        Ask about today&apos;s plan. To train, use <span className="font-medium text-zinc-700">Approve &amp; start</span> on the workout card — that opens the Active Workout logger. Chat never marks a workout completed.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {GYM_QUESTION_CHIPS.slice(0, 6).map(chip => (
          <button
            key={chip.id}
            type="button"
            onClick={() => { void ask(chip.prompt) }}
            className="text-[10px] px-2 py-1 rounded-full border border-emerald-100 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/80 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) void ask(prompt.trim()) }}
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
    </GymCard>
  )
}
