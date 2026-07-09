'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { loadCommandCenterState } from '@/lib/command-center/storage'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { scoreAllObjects } from '@/lib/executive-engine/attentionScoring'
import { generateDailyExecutiveBriefing } from '@/lib/executive-engine/briefingEngine'
import { resolveExecutiveConflicts } from '@/lib/executive-engine/conflictResolution'
import { createExecutiveContext } from '@/lib/executive-engine/executiveContext'
import {
  answerExecutiveQuestion,
  generateExecutiveRecommendations,
  getTopFocus,
} from '@/lib/executive-engine/recommendationEngine'
import {
  getRecentBriefings,
  getRecentDecisions,
  reloadExecutiveStore,
  saveBriefing,
  saveDecision,
} from '@/lib/executive-engine/executiveStorage'
import type {
  AttentionScore,
  ExecutiveBriefing,
  ExecutiveContext,
  ExecutiveDecision,
  ExecutiveRecommendation,
} from '@/lib/executive-engine/executiveTypes'

interface ExecutiveEngineContextValue {
  ready: boolean
  executiveContext: ExecutiveContext | null
  attentionScores: AttentionScore[]
  recommendations: ExecutiveRecommendation[]
  dailyBriefing: ExecutiveBriefing | null
  warnings: string[]
  tradeoffs: string[]
  recentDecisions: ExecutiveDecision[]
  regenerateBriefing: () => void
  makeDecision: (question: string) => ExecutiveDecision
  getTopFocus: () => { title: string; summary: string; objectId?: string; score?: number }
  getWarnings: () => string[]
  refresh: () => void
}

const ExecutiveEngineContext = createContext<ExecutiveEngineContextValue | null>(null)

function computeExecutive(
  objects: ReturnType<typeof useObjectEngine>['objects'],
  memories: ReturnType<typeof useMemoryEngine>['memories'],
  knowledge: ReturnType<typeof useKnowledgeEngine>['knowledge'],
) {
  const commandCenterState = loadCommandCenterState()
  const executiveContext = createExecutiveContext({ objects, memories, knowledge, commandCenterState })
  const attentionScores = scoreAllObjects(executiveContext)
  const { warnings, tradeoffs } = resolveExecutiveConflicts(executiveContext, attentionScores)
  const recommendations = generateExecutiveRecommendations(executiveContext, attentionScores)
  const dailyBriefing = generateDailyExecutiveBriefing(
    executiveContext,
    recommendations,
    attentionScores,
    warnings,
  )
  return { executiveContext, attentionScores, recommendations, dailyBriefing, warnings, tradeoffs }
}

export function ExecutiveEngineProvider({ children }: { children: React.ReactNode }) {
  const { objects, ready: objectsReady } = useObjectEngine()
  const { memories, ready: memoriesReady } = useMemoryEngine()
  const { knowledge, ready: knowledgeReady } = useKnowledgeEngine()
  const [storedBriefings, setStoredBriefings] = useState(getRecentBriefings)
  const [recentDecisions, setRecentDecisions] = useState(getRecentDecisions)
  const [tick, setTick] = useState(0)

  const ready = objectsReady && memoriesReady && knowledgeReady

  const computed = useMemo(() => {
    if (!ready) return null
    return computeExecutive(objects, memories, knowledge)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, objects, memories, knowledge, tick])

  useEffect(() => {
    if (!computed) return
    const today = computed.executiveContext.date
    const existing = getRecentBriefings().find(
      b => b.type === 'daily' && b.generatedAt.slice(0, 10) === today,
    )
    if (!existing) {
      const saved = saveBriefing(computed.dailyBriefing)
      setStoredBriefings(prev => [saved, ...prev.filter(b => b.id !== saved.id)])
    }
  }, [computed])

  const regenerateBriefing = useCallback(() => {
    if (!ready) return
    const result = computeExecutive(objects, memories, knowledge)
    const saved = saveBriefing(result.dailyBriefing)
    setStoredBriefings(prev => [saved, ...prev.filter(b => b.id !== saved.id)])
    setTick(t => t + 1)
  }, [ready, objects, memories, knowledge])

  const makeDecision = useCallback((question: string): ExecutiveDecision => {
    if (!computed) {
      return saveDecision({
        question,
        answer: 'Executive Engine is still loading.',
        rationale: 'Wait for objects and memories to load.',
        tradeoffs: [],
        relatedObjectIds: [],
        relatedMemoryIds: [],
      })
    }
    const draft = answerExecutiveQuestion(
      question,
      computed.executiveContext,
      computed.recommendations,
      computed.warnings,
      computed.attentionScores,
    )
    const decision = saveDecision(draft)
    setRecentDecisions(getRecentDecisions())
    return decision
  }, [computed])

  const refresh = useCallback(() => {
    reloadExecutiveStore()
    setStoredBriefings(getRecentBriefings())
    setRecentDecisions(getRecentDecisions())
    setTick(t => t + 1)
  }, [])

  const value = useMemo<ExecutiveEngineContextValue>(() => ({
    ready,
    executiveContext: computed?.executiveContext ?? null,
    attentionScores: computed?.attentionScores ?? [],
    recommendations: computed?.recommendations ?? [],
    dailyBriefing: computed?.dailyBriefing ?? null,
    warnings: computed?.warnings ?? [],
    tradeoffs: computed?.tradeoffs ?? [],
    recentDecisions,
    regenerateBriefing,
    makeDecision,
    getTopFocus: () => {
      if (!computed) return { title: 'Loading…', summary: '' }
      return getTopFocus(computed.recommendations, computed.attentionScores, computed.executiveContext)
    },
    getWarnings: () => computed?.warnings ?? [],
    refresh,
  }), [
    ready, computed, recentDecisions,
    regenerateBriefing, makeDecision, refresh,
  ])

  return (
    <ExecutiveEngineContext.Provider value={value}>
      {children}
    </ExecutiveEngineContext.Provider>
  )
}

export function useExecutiveEngine() {
  const ctx = useContext(ExecutiveEngineContext)
  if (!ctx) throw new Error('useExecutiveEngine must be used within ExecutiveEngineProvider')
  return ctx
}
