'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { loadCommandCenterState } from '@/lib/command-center/storage'
import { buildDailyContext } from '@/lib/context-builder/contextBuilder'
import { saveDailyContext, getDailyContext } from '@/lib/context-builder/contextStorage'
import type { DailyContext } from '@/lib/context-builder/contextTypes'
import { useExecutiveEngine } from '@/contexts/ExecutiveEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { generateDailyReasoning } from '@/lib/reasoning-engine/dailyReasoning'
import { saveDailyReasoning, getDailyReasoning } from '@/lib/reasoning-engine/reasoningStorage'
import type { DailyReasoningOutput } from '@/lib/reasoning-engine/reasoningTypes'
import { getTomorrowContextData } from '@/lib/daily-learning-loop/tomorrowContext'
import { generateMorningExecutionPlan } from '@/lib/morning-execution/morningExecution'
import {
  getMorningPlan,
  memoryForMorningPlan,
  nowISO,
  saveMorningPlan,
  todayISO,
} from '@/lib/morning-execution/morningStorage'
import type { MorningExecutionPlan } from '@/lib/morning-execution/morningTypes'
import type { RecommendedPlanItem } from '@/lib/reasoning-engine/reasoningTypes'

interface MorningExecutionContextValue {
  ready: boolean
  dailyContext: DailyContext | null
  reasoningOutput: DailyReasoningOutput | null
  morningPlan: MorningExecutionPlan | null
  regenerateMorningPlan: (writeMemory?: boolean) => void
  markPlanCompleted: () => void
  updatePrimaryMission: (mission: string) => void
  updatePlanItem: (itemId: string, updates: Partial<RecommendedPlanItem>) => void
  getFirstAction: () => RecommendedPlanItem | null
  refresh: () => void
}

const MorningExecutionContext = createContext<MorningExecutionContextValue | null>(null)

function runPipeline(
  objects: ReturnType<typeof useObjectEngine>['objects'],
  memories: ReturnType<typeof useMemoryEngine>['memories'],
  knowledge: ReturnType<typeof useKnowledgeEngine>['knowledge'],
  executive: ReturnType<typeof useExecutiveEngine>,
) {
  const commandCenterState = loadCommandCenterState()
  const tomorrowContext = getTomorrowContextData(todayISO())
  const dailyContext = buildDailyContext({
    objects,
    memories,
    knowledge,
    executiveState: {
      recommendations: executive.recommendations,
      warnings: executive.warnings,
      tradeoffs: executive.tradeoffs,
    },
    commandCenterState,
    healthSignals: executive.executiveContext?.healthSignals ?? null,
  })
  const reasoningOutput = generateDailyReasoning(dailyContext, tomorrowContext)
  const morningPlan = generateMorningExecutionPlan({ dailyContext, reasoningOutput, tomorrowContext })
  return { dailyContext, reasoningOutput, morningPlan }
}

export function MorningExecutionProvider({ children }: { children: React.ReactNode }) {
  const { objects, ready: objectsReady } = useObjectEngine()
  const { memories, ready: memoriesReady, recordMemory } = useMemoryEngine()
  const { knowledge, ready: knowledgeReady } = useKnowledgeEngine()
  const executive = useExecutiveEngine()

  const [dailyContext, setDailyContext] = useState<DailyContext | null>(null)
  const [reasoningOutput, setReasoningOutput] = useState<DailyReasoningOutput | null>(null)
  const [morningPlan, setMorningPlan] = useState<MorningExecutionPlan | null>(null)
  const [tick, setTick] = useState(0)

  const ready = objectsReady && memoriesReady && knowledgeReady && executive.ready

  const writePlanMemory = useCallback((
    plan: MorningExecutionPlan,
    force = false,
  ) => {
    const memInput = memoryForMorningPlan(plan, force)
    if (memInput) {
      recordMemory(memInput)
      return { ...plan, memoryWritten: true, updatedAt: nowISO() }
    }
    return plan
  }, [recordMemory])

  const persistPipeline = useCallback((
    result: ReturnType<typeof runPipeline>,
    options?: { writeMemory?: boolean; forceMemory?: boolean },
  ) => {
    saveDailyContext(result.dailyContext)
    saveDailyReasoning(result.reasoningOutput)
    let plan = saveMorningPlan(result.morningPlan)
    if (options?.writeMemory !== false) {
      plan = writePlanMemory(plan, options?.forceMemory ?? false)
      if (plan.memoryWritten) saveMorningPlan(plan)
    }
    setDailyContext(result.dailyContext)
    setReasoningOutput(result.reasoningOutput)
    setMorningPlan(plan)
    return plan
  }, [writePlanMemory])

  useEffect(() => {
    if (!ready) return

    const today = todayISO()
    const existingPlan = getMorningPlan(today)
    const existingContext = getDailyContext(today)
    const existingReasoning = getDailyReasoning(today)

    if (existingPlan && existingContext && existingReasoning) {
      setMorningPlan(existingPlan)
      setDailyContext(existingContext)
      setReasoningOutput(existingReasoning)
      return
    }

    const result = runPipeline(objects, memories, knowledge, executive)
    persistPipeline(result, { writeMemory: true, forceMemory: false })
  }, [ready, objects, memories, knowledge, executive, tick, persistPipeline])

  const regenerateMorningPlan = useCallback((writeMemory = true) => {
    if (!ready) return
    const result = runPipeline(objects, memories, knowledge, executive)
    persistPipeline(result, { writeMemory, forceMemory: writeMemory })
    setTick(t => t + 1)
  }, [ready, objects, memories, knowledge, executive, persistPipeline])

  const markPlanCompleted = useCallback(() => {
    if (!morningPlan) return
    const updated: MorningExecutionPlan = {
      ...morningPlan,
      completed: true,
      updatedAt: nowISO(),
    }
    saveMorningPlan(updated)
    setMorningPlan(updated)
  }, [morningPlan])

  const updatePrimaryMission = useCallback((mission: string) => {
    if (!morningPlan || !dailyContext) return
    const updatedPlan: MorningExecutionPlan = {
      ...morningPlan,
      primaryMission: mission.trim(),
      updatedAt: nowISO(),
    }
    const updatedContext: DailyContext = {
      ...dailyContext,
      mission: mission.trim(),
      generatedAt: nowISO(),
    }
    saveMorningPlan(updatedPlan)
    saveDailyContext(updatedContext)
    setMorningPlan(updatedPlan)
    setDailyContext(updatedContext)
  }, [morningPlan, dailyContext])

  const updatePlanItem = useCallback((
    itemId: string,
    updates: Partial<RecommendedPlanItem>,
  ) => {
    if (!morningPlan || !reasoningOutput) return
    const nextPlanItems = morningPlan.topPriorities.map(item =>
      item.id === itemId ? { ...item, ...updates } : item,
    )
    const nextReasoningPlan = reasoningOutput.recommendedPlan.map(item =>
      item.id === itemId ? { ...item, ...updates } : item,
    )
    const updatedReasoning: DailyReasoningOutput = {
      ...reasoningOutput,
      recommendedPlan: nextReasoningPlan,
      generatedAt: nowISO(),
    }
    const updatedPlan: MorningExecutionPlan = {
      ...morningPlan,
      topPriorities: nextPlanItems,
      updatedAt: nowISO(),
    }
    saveDailyReasoning(updatedReasoning)
    saveMorningPlan(updatedPlan)
    setReasoningOutput(updatedReasoning)
    setMorningPlan(updatedPlan)
  }, [morningPlan, reasoningOutput])

  const refresh = useCallback(() => {
    setTick(t => t + 1)
  }, [])

  const value = useMemo<MorningExecutionContextValue>(() => ({
    ready,
    dailyContext,
    reasoningOutput,
    morningPlan,
    regenerateMorningPlan,
    markPlanCompleted,
    updatePrimaryMission,
    updatePlanItem,
    getFirstAction: () => morningPlan?.topPriorities.find(p => !p.completed) ?? null,
    refresh,
  }), [
    ready, dailyContext, reasoningOutput, morningPlan,
    regenerateMorningPlan, markPlanCompleted, updatePrimaryMission,
    updatePlanItem, refresh,
  ])

  return (
    <MorningExecutionContext.Provider value={value}>
      {children}
    </MorningExecutionContext.Provider>
  )
}

export function useMorningExecution() {
  const ctx = useContext(MorningExecutionContext)
  if (!ctx) throw new Error('useMorningExecution must be used within MorningExecutionProvider')
  return ctx
}
