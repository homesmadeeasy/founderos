'use client'

import { useMemo } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'
import { useEveningReview } from '@/contexts/EveningReviewContext'
import { getOutcomeHistory } from '@/lib/outcome-engine/outcomeEngine'
import type { FounderBaseInput } from '@/lib/specialists/founder/founderInputBuilder'

/**
 * Gathers FounderInput from source/data providers that exist outside CognitiveModelProvider.
 * Must never import or call useCognitiveModel — CognitiveModelProvider consumes this hook.
 */
export function useFounderBaseInput(): FounderBaseInput {
  const { appState } = useAppContext()
  const { objects } = useObjectEngine()
  const { memories } = useMemoryEngine()
  const { knowledge } = useKnowledgeEngine()
  const { signals } = useSignalEngine()
  const { unprocessedCount } = useUniversalCapture()
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
    unprocessedCaptureCount: unprocessedCount,
  }), [
    objects, memories, knowledge, signals, outcomes,
    appState.tasks, appState.projects,
    decisionOutput, domainIntelligence, morningPlan,
    dailyContext, eveningReview, unprocessedCount,
  ])
}
