'use client'

import { useMemo } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { useEveningReview } from '@/contexts/EveningReviewContext'
import { getOutcomeHistory } from '@/lib/outcome-engine/outcomeEngine'
import type { GymBaseInput } from '@/lib/specialists/gym/gymInputBuilder'

export function useGymBaseInput(): GymBaseInput {
  const { appState } = useAppContext()
  const { objects } = useObjectEngine()
  const { memories } = useMemoryEngine()
  const { knowledge } = useKnowledgeEngine()
  const { signals } = useSignalEngine()
  const { eveningReview } = useEveningReview()
  const {
    dailyContext,
    morningPlan,
    decisionOutput,
    domainIntelligence,
  } = useMorningExecution()

  const outcomes = useMemo(() => getOutcomeHistory(12), [])

  return useMemo(() => ({
    objects,
    memories,
    knowledge,
    signals,
    outcomes,
    tasks: appState.tasks,
    projects: appState.projects,
    decisionOutput,
    domainIntelligence,
    morningPlan,
    dailyContext,
    eveningReview,
    healthSignals: dailyContext?.healthSignals ?? null,
  }), [
    objects, memories, knowledge, signals, outcomes,
    appState.tasks, appState.projects,
    decisionOutput, domainIntelligence, morningPlan,
    dailyContext, eveningReview,
  ])
}
