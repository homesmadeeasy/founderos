'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useIdentity } from '@/contexts/IdentityContext'
import { useReality } from '@/contexts/RealityContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useCognitiveModel } from '@/contexts/CognitiveModelContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useExecutiveEngine } from '@/contexts/ExecutiveEngineContext'
import {
  runIntelligencePipeline,
  sourcesFromEngines,
  getLastIntelligenceResult,
  subscribeIntelligenceResults,
  type IntelligenceRequest,
  type IntelligenceResult,
  type IntelligenceSources,
} from '@/lib/intelligence-pipeline'

interface IntelligencePipelineContextValue {
  lastResult: IntelligenceResult | null
  run: (
    request: IntelligenceRequest,
    overrides?: Partial<IntelligenceSources>,
  ) => Promise<IntelligenceResult>
}

const IntelligencePipelineContext = createContext<IntelligencePipelineContextValue | null>(null)

/**
 * Gathers live engine reads once per run and delegates to the orchestrator.
 * Specialists should call useIntelligencePipeline().run() instead of fan-out.
 */
export function IntelligencePipelineProvider({ children }: { children: ReactNode }) {
  const { getViewForSpecialist: getIdentityView } = useIdentity()
  const { getSnapshot: getRealitySnapshot } = useReality()
  const { memories } = useMemoryEngine()
  const { knowledge } = useKnowledgeEngine()
  const { worldModel } = useCognitiveModel()
  const { reasoningOutput, decisionOutput, morningPlan } = useMorningExecution()
  const { recommendations } = useExecutiveEngine()
  const [lastResult, setLastResult] = useState<IntelligenceResult | null>(() => getLastIntelligenceResult())

  useEffect(() => subscribeIntelligenceResults(setLastResult), [])

  const run = useCallback(async (
    request: IntelligenceRequest,
    overrides: Partial<IntelligenceSources> = {},
  ) => {
    const specialist = String(request.specialist || request.specialistId || 'unknown')
    const question = (request.userMessage || request.question || '').trim()
    const identity = getIdentityView(specialist)
    const reality = getRealitySnapshot(specialist)
    const decisionSummary = decisionOutput
      ? `${decisionOutput.primaryDecision.title}: ${decisionOutput.primaryDecision.reason}`
      : null
    const reasoningSummary = reasoningOutput
      ? `${reasoningOutput.primaryFocus}. ${reasoningOutput.summary}`
      : null
    const goals = [
      ...(morningPlan?.primaryMission ? [morningPlan.primaryMission] : []),
      ...(decisionOutput?.primaryDecision?.title ? [decisionOutput.primaryDecision.title] : []),
      ...(reasoningOutput?.primaryFocus ? [reasoningOutput.primaryFocus] : []),
    ]
    const executiveRecommendations = recommendations
      .slice(0, 5)
      .map(r => r.title)

    const base = sourcesFromEngines({
      question,
      identity,
      reality,
      memories,
      knowledge: knowledge.map(k => ({
        id: k.id,
        title: k.title,
        summary: k.principle,
        content: k.explanation,
      })),
      worldModel,
      goals,
      decisionSummary,
      reasoningSummary: reasoningSummary ?? undefined,
      executiveRecommendations,
    })

    return runIntelligencePipeline({
      ...request,
      specialist,
      specialistId: specialist,
      userMessage: question,
      question,
    }, {
      ...base,
      realityMomentumLabel: reality.momentum?.label,
      realityEventCountToday: reality.eventCountToday,
      ...overrides,
    })
  }, [
    getIdentityView,
    getRealitySnapshot,
    memories,
    knowledge,
    worldModel,
    reasoningOutput,
    decisionOutput,
    morningPlan,
    recommendations,
  ])

  const value = useMemo(() => ({ lastResult, run }), [lastResult, run])

  return (
    <IntelligencePipelineContext.Provider value={value}>
      {children}
    </IntelligencePipelineContext.Provider>
  )
}

export function useIntelligencePipeline(): IntelligencePipelineContextValue {
  const ctx = useContext(IntelligencePipelineContext)
  if (!ctx) {
    throw new Error('useIntelligencePipeline must be used within IntelligencePipelineProvider')
  }
  return ctx
}
