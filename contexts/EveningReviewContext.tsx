'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { useExecutiveEngine } from '@/contexts/ExecutiveEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { generateDailyLearningLoop } from '@/lib/daily-learning-loop/dailyLoop'
import type { DailyLearningLoopOutput, TomorrowContextData } from '@/lib/daily-learning-loop/dailyLoopTypes'
import {
  getTomorrowContextData,
  saveTomorrowContext,
} from '@/lib/daily-learning-loop/tomorrowContext'
import {
  addListItem,
  getOrCreateEveningReview,
  removeListItem,
  syncPrioritiesFromMorning,
  togglePriorityCompletion,
} from '@/lib/evening-review/eveningReview'
import {
  saveEveningReview,
  updateEveningReview as storageUpdate,
} from '@/lib/evening-review/eveningStorage'
import type { EnergyLevel, EveningReview } from '@/lib/evening-review/eveningTypes'
import { todayISO } from '@/lib/evening-review/eveningUtils'
import type { KnowledgeSuggestion } from '@/lib/knowledge-engine/knowledgeTypes'
import { buildOutcomeCompletionPayload, getPredictionForDate } from '@/lib/outcome-engine/outcomeEngine'
import { processSignal } from '@/lib/signal-engine/signalPipeline'
import { getSignalById } from '@/lib/signal-engine/signalStorage'

interface EveningReviewContextValue {
  ready: boolean
  eveningReview: EveningReview | null
  dailyLearningLoop: DailyLearningLoopOutput | null
  tomorrowContext: TomorrowContextData | null
  updateEveningReview: (updates: Partial<EveningReview>) => void
  togglePriority: (title: string, completed: boolean) => void
  addItem: (field: 'wins' | 'blockers' | 'lessons', value: string) => void
  removeItem: (field: 'wins' | 'blockers' | 'lessons', index: number) => void
  toggleMatteredSignal: (signalId: string) => void
  toggleIgnoredSignal: (signalId: string) => void
  convertSignalToMemory: (signalId: string) => void
  completeEveningReview: () => void
  regenerateLearningLoop: () => void
  saveKnowledgeSuggestion: (suggestion: KnowledgeSuggestion) => string | null
  isSuggestionSaved: (suggestion: KnowledgeSuggestion) => boolean
  refresh: () => void
}

const EveningReviewContext = createContext<EveningReviewContextValue | null>(null)

function buildLoop(
  review: EveningReview,
  morningPlan: ReturnType<typeof useMorningExecution>['morningPlan'],
  objects: ReturnType<typeof useObjectEngine>['objects'],
  memories: ReturnType<typeof useMemoryEngine>['memories'],
  knowledge: ReturnType<typeof useKnowledgeEngine>['knowledge'],
  executive: ReturnType<typeof useExecutiveEngine>,
): DailyLearningLoopOutput {
  return generateDailyLearningLoop({
    morningPlan,
    objects,
    memories,
    knowledge,
    executiveState: {
      recommendations: executive.recommendations,
      warnings: executive.warnings,
    },
    eveningReview: review,
  })
}

export function EveningReviewProvider({ children }: { children: React.ReactNode }) {
  const { morningPlan, ready: morningReady } = useMorningExecution()
  const { objects, ready: objectsReady } = useObjectEngine()
  const { memories, ready: memoriesReady, recordMemory } = useMemoryEngine()
  const { knowledge, ready: knowledgeReady, createKnowledge } = useKnowledgeEngine()
  const executive = useExecutiveEngine()
  const { refresh: refreshSignals } = useSignalEngine()

  const [eveningReview, setEveningReview] = useState<EveningReview | null>(null)
  const [dailyLearningLoop, setDailyLearningLoop] = useState<DailyLearningLoopOutput | null>(null)
  const [tick, setTick] = useState(0)

  const ready = morningReady && objectsReady && memoriesReady && knowledgeReady && executive.ready

  const tomorrowContext = useMemo(
    () => getTomorrowContextData(todayISO()),
    [eveningReview?.completed, dailyLearningLoop?.createdAt, tick],
  )

  const persistReview = useCallback((review: EveningReview, loop?: DailyLearningLoopOutput | null) => {
    saveEveningReview(review)
    setEveningReview(review)
    if (loop) setDailyLearningLoop(loop)
  }, [])

  useEffect(() => {
    if (!ready) return

    let review = getOrCreateEveningReview(morningPlan)
    review = syncPrioritiesFromMorning(review, morningPlan)
    const todayPrediction = getPredictionForDate(todayISO())
    if (todayPrediction && !review.outcomePredictionId) {
      review = { ...review, outcomePredictionId: todayPrediction.id }
    }
    saveEveningReview(review)
    setEveningReview(review)

    const loop = buildLoop(review, morningPlan, objects, memories, knowledge, executive)
    setDailyLearningLoop(loop)
  }, [ready, morningPlan, objects, memories, knowledge, executive, tick])

  const regenerateLearningLoop = useCallback(() => {
    if (!eveningReview) return
    const loop = buildLoop(eveningReview, morningPlan, objects, memories, knowledge, executive)
    setDailyLearningLoop(loop)
  }, [eveningReview, morningPlan, objects, memories, knowledge, executive])

  const updateEveningReview = useCallback((updates: Partial<EveningReview>) => {
    if (!eveningReview) return
    const updated = storageUpdate(eveningReview.id, updates)
    if (!updated) return
    const loop = buildLoop(updated, morningPlan, objects, memories, knowledge, executive)
    persistReview(updated, loop)
  }, [eveningReview, morningPlan, objects, memories, knowledge, executive, persistReview])

  const togglePriority = useCallback((title: string, completed: boolean) => {
    if (!eveningReview) return
    const updated = togglePriorityCompletion(eveningReview, title, completed)
    const loop = buildLoop(updated, morningPlan, objects, memories, knowledge, executive)
    persistReview(updated, loop)
  }, [eveningReview, morningPlan, objects, memories, knowledge, executive, persistReview])

  const addItem = useCallback((field: 'wins' | 'blockers' | 'lessons', value: string) => {
    if (!eveningReview) return
    const updated = addListItem(eveningReview, field, value)
    const loop = buildLoop(updated, morningPlan, objects, memories, knowledge, executive)
    persistReview(updated, loop)
  }, [eveningReview, morningPlan, objects, memories, knowledge, executive, persistReview])

  const removeItem = useCallback((field: 'wins' | 'blockers' | 'lessons', index: number) => {
    if (!eveningReview) return
    const updated = removeListItem(eveningReview, field, index)
    const loop = buildLoop(updated, morningPlan, objects, memories, knowledge, executive)
    persistReview(updated, loop)
  }, [eveningReview, morningPlan, objects, memories, knowledge, executive, persistReview])

  const toggleMatteredSignal = useCallback((signalId: string) => {
    if (!eveningReview) return
    const mattered = eveningReview.matteredSignalIds.includes(signalId)
    const nextMattered = mattered
      ? eveningReview.matteredSignalIds.filter(id => id !== signalId)
      : [...eveningReview.matteredSignalIds, signalId]
    const nextIgnored = mattered
      ? eveningReview.ignoredSignalIds
      : eveningReview.ignoredSignalIds.filter(id => id !== signalId)
    updateEveningReview({ matteredSignalIds: nextMattered, ignoredSignalIds: nextIgnored })
  }, [eveningReview, updateEveningReview])

  const toggleIgnoredSignal = useCallback((signalId: string) => {
    if (!eveningReview) return
    const ignored = eveningReview.ignoredSignalIds.includes(signalId)
    const nextIgnored = ignored
      ? eveningReview.ignoredSignalIds.filter(id => id !== signalId)
      : [...eveningReview.ignoredSignalIds, signalId]
    const nextMattered = ignored
      ? eveningReview.matteredSignalIds
      : eveningReview.matteredSignalIds.filter(id => id !== signalId)
    updateEveningReview({ ignoredSignalIds: nextIgnored, matteredSignalIds: nextMattered })
  }, [eveningReview, updateEveningReview])

  const convertSignalToMemory = useCallback((signalId: string) => {
    const signal = getSignalById(signalId)
    if (!signal || signal.processed) return
    processSignal(signalId, { recordMemory })
    refreshSignals()
    if (!eveningReview) return
    if (!eveningReview.matteredSignalIds.includes(signalId)) {
      updateEveningReview({
        matteredSignalIds: [...eveningReview.matteredSignalIds, signalId],
        ignoredSignalIds: eveningReview.ignoredSignalIds.filter(id => id !== signalId),
      })
    }
  }, [eveningReview, recordMemory, updateEveningReview, refreshSignals])

  const saveKnowledgeSuggestion = useCallback((suggestion: KnowledgeSuggestion): string | null => {
    if (!eveningReview) return null

    const existing = knowledge.find(
      k => k.title === suggestion.suggestedTitle
        || eveningReview.suggestedKnowledgeIds.includes(k.id),
    )
    if (existing) return existing.id

    const created = createKnowledge({
      type: suggestion.suggestedType,
      title: suggestion.suggestedTitle,
      principle: suggestion.suggestedPrinciple,
      explanation: suggestion.suggestedExplanation,
      domain: suggestion.suggestedDomain,
      confidence: suggestion.confidence,
      source: 'review',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      tags: [`evening-review:${eveningReview.date}`],
    })

    const updated = storageUpdate(eveningReview.id, {
      suggestedKnowledgeIds: [...new Set([...eveningReview.suggestedKnowledgeIds, created.id])],
    })
    if (updated) setEveningReview(updated)

    return created.id
  }, [eveningReview, knowledge, createKnowledge])

  const completeEveningReview = useCallback(() => {
    if (!eveningReview || eveningReview.completed) return

    const loop = buildLoop(eveningReview, morningPlan, objects, memories, knowledge, executive)
    const memoryIds: string[] = [...eveningReview.generatedMemories]
    let suggestedKnowledgeIds = [...eveningReview.suggestedKnowledgeIds]

    if (!eveningReview.memoriesWritten) {
      for (const memInput of loop.generatedMemoryInputs) {
        const created = recordMemory(memInput)
        if (created) memoryIds.push(created.id)
      }

      if (
        eveningReview.outcomePredictionId
        && eveningReview.outcomeCompleted
        && eveningReview.outcomeQuality
      ) {
        const payload = buildOutcomeCompletionPayload(eveningReview.outcomePredictionId, {
          completed: eveningReview.outcomeCompleted,
          outcomeQuality: eveningReview.outcomeQuality,
          actualResult: eveningReview.outcomeActualResult ?? '',
          reflection: eveningReview.outcomeReflection,
          energyAfter: eveningReview.outcomeEnergyAfter,
          moodAfter: eveningReview.outcomeMoodAfter,
          lessons: eveningReview.outcomeLesson,
        })
        if (payload) {
          const mem = recordMemory(payload.memory)
          if (mem) memoryIds.push(mem.id)
          if (payload.knowledgeSuggestion) {
            const kid = saveKnowledgeSuggestion(payload.knowledgeSuggestion)
            if (kid && !suggestedKnowledgeIds.includes(kid)) {
              suggestedKnowledgeIds = [...suggestedKnowledgeIds, kid]
            }
          }
        }
      }

      for (const signalId of eveningReview.matteredSignalIds) {
        const signal = getSignalById(signalId)
        if (!signal || signal.processed) continue
        const processed = processSignal(signalId, { recordMemory })
        if (processed?.relatedMemoryIds.length) {
          memoryIds.push(...processed.relatedMemoryIds.filter(id => !memoryIds.includes(id)))
        }
      }
    }

    saveTomorrowContext(eveningReview.date, loop.tomorrowContext)

    const completed: EveningReview = {
      ...eveningReview,
      completed: true,
      memoriesWritten: true,
      generatedMemories: memoryIds,
      suggestedKnowledgeIds,
      updatedAt: new Date().toISOString(),
    }
    persistReview(completed, loop)
    setTick(t => t + 1)
  }, [
    eveningReview, morningPlan, objects, memories, knowledge, executive,
    recordMemory, persistReview, saveKnowledgeSuggestion,
  ])

  const isSuggestionSaved = useCallback((suggestion: KnowledgeSuggestion): boolean => {
    if (!eveningReview) return false
    return knowledge.some(
      k => k.title === suggestion.suggestedTitle
        || eveningReview.suggestedKnowledgeIds.includes(k.id),
    )
  }, [eveningReview, knowledge])

  const refresh = useCallback(() => {
    setTick(t => t + 1)
  }, [])

  const value = useMemo<EveningReviewContextValue>(() => ({
    ready,
    eveningReview,
    dailyLearningLoop,
    tomorrowContext,
    updateEveningReview,
    togglePriority,
    addItem,
    removeItem,
    toggleMatteredSignal,
    toggleIgnoredSignal,
    convertSignalToMemory,
    completeEveningReview,
    regenerateLearningLoop,
    saveKnowledgeSuggestion,
    isSuggestionSaved,
    refresh,
  }), [
    ready, eveningReview, dailyLearningLoop, tomorrowContext,
    updateEveningReview, togglePriority, addItem, removeItem,
    toggleMatteredSignal, toggleIgnoredSignal, convertSignalToMemory, completeEveningReview, regenerateLearningLoop,
    saveKnowledgeSuggestion, isSuggestionSaved, refresh,
  ])

  return (
    <EveningReviewContext.Provider value={value}>
      {children}
    </EveningReviewContext.Provider>
  )
}

export function useEveningReview() {
  const ctx = useContext(EveningReviewContext)
  if (!ctx) throw new Error('useEveningReview must be used within EveningReviewProvider')
  return ctx
}

export type { EnergyLevel }
