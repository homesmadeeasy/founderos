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
import { buildFounderSnapshot } from '@/lib/specialists/founder/founderUtils'
import type { FounderInput, FounderSnapshot } from '@/lib/specialists/founder/founderTypes'

export function useFounderSnapshot(): FounderSnapshot {
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

  return useMemo(() => {
    const input: FounderInput = {
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
    }
    return buildFounderSnapshot(input)
  }, [
    objects, memories, knowledge, signals, outcomes,
    appState.tasks, appState.projects,
    decisionOutput, domainIntelligence, morningPlan,
    dailyContext, eveningReview, unprocessedCount,
  ])
}
