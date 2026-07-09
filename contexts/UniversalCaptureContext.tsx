'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { runCapturePipeline } from '@/lib/capture-engine/capturePipeline'
import {
  getCaptureStatsForDate,
  searchUnified,
  type UnifiedSearchResult,
} from '@/lib/capture-engine/captureSearch'
import type { CaptureResult, CaptureSignal, CaptureSource } from '@/lib/capture-engine/captureTypes'
import { todayISO } from '@/lib/capture-engine/captureUtils'
import type { KnowledgeSuggestion } from '@/lib/knowledge-engine/knowledgeTypes'
import {
  reloadCaptureStore,
  updateSignal,
} from '@/lib/capture-engine/captureStorage'
import { createObject as storageCreateObject, getObjectById as storageGetObject, updateObject as storageUpdateObject } from '@/lib/object-engine/objectStorage'
import type { CCCaptureItem } from '@/lib/command-center/types'

interface UniversalCaptureContextValue {
  ready: boolean
  signals: CaptureSignal[]
  todaySignals: CaptureSignal[]
  unprocessedCount: number
  lastResult: CaptureResult | null
  captureOpen: boolean
  openCapture: () => void
  closeCapture: () => void
  capture: (rawInput: string, source?: CaptureSource) => CaptureResult
  markProcessed: (id: string) => void
  markNeedsReview: (id: string) => void
  archiveSignal: (id: string) => void
  search: (query: string) => UnifiedSearchResult[]
  saveKnowledgeSuggestion: (suggestion: KnowledgeSuggestion) => string | null
  refresh: () => void
  getYesterdayCaptureSummary: () => string | null
}

const UniversalCaptureContext = createContext<UniversalCaptureContextValue | null>(null)

export function UniversalCaptureProvider({ children }: { children: React.ReactNode }) {
  const { memories, recordMemory, ready: memoriesReady } = useMemoryEngine()
  const { syncCaptureFromCommandCenter, refresh: refreshObjects, ready: objectsReady } = useObjectEngine()
  const { createKnowledge, ready: knowledgeReady } = useKnowledgeEngine()
  const { ingestFromCapture, ready: signalsReady } = useSignalEngine()

  const [signals, setSignals] = useState<CaptureSignal[]>([])
  const [lastResult, setLastResult] = useState<CaptureResult | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)

  const ready = memoriesReady && objectsReady && knowledgeReady && signalsReady

  const reloadFromStore = useCallback(() => {
    setSignals(reloadCaptureStore().signals)
  }, [])

  useEffect(() => {
    if (!ready) return
    reloadFromStore()
  }, [ready, reloadFromStore])

  const capture = useCallback((rawInput: string, source: CaptureSource = 'manual'): CaptureResult => {
    const result = runCapturePipeline(
      { rawInput, source },
      {
        createObjectSync: (input) => {
          const existing = storageGetObject(input.id!)
          if (existing) {
            storageUpdateObject(input.id!, input)
            return { ...existing, ...input } as typeof existing
          }
          return storageCreateObject(input)
        },
        recordMemory,
        memories,
        syncCommandCenterCapture: (item: CCCaptureItem) => {
          syncCaptureFromCommandCenter(item)
        },
      },
    )
    ingestFromCapture({
      id: result.signal.id,
      rawInput: result.signal.rawInput,
      parsedTitle: result.signal.parsedTitle,
      parsedContent: result.signal.parsedContent,
      classification: result.signal.classification,
      createdObjectId: result.objectId,
      createdMemoryId: result.memoryId,
    })
    setLastResult(result)
    refreshObjects()
    reloadFromStore()
    return result
  }, [recordMemory, memories, syncCaptureFromCommandCenter, refreshObjects, reloadFromStore, ingestFromCapture])

  const markProcessed = useCallback((id: string) => {
    updateSignal(id, { status: 'processed', processed: true })
    reloadFromStore()
  }, [reloadFromStore])

  const markNeedsReview = useCallback((id: string) => {
    updateSignal(id, { status: 'needs_review' })
    reloadFromStore()
  }, [reloadFromStore])

  const archiveSignal = useCallback((id: string) => {
    updateSignal(id, { status: 'archived' })
    reloadFromStore()
  }, [reloadFromStore])

  const saveKnowledgeSuggestion = useCallback((suggestion: KnowledgeSuggestion): string | null => {
    const created = createKnowledge({
      type: suggestion.suggestedType,
      title: suggestion.suggestedTitle,
      principle: suggestion.suggestedPrinciple,
      explanation: suggestion.suggestedExplanation,
      domain: suggestion.suggestedDomain,
      confidence: suggestion.confidence,
      source: 'review',
      relatedObjectIds: [],
      relatedMemoryIds: suggestion.memoryId ? [suggestion.memoryId] : [],
      tags: ['universal-capture'],
    })
    const signal = signals.find(s => s.createdMemoryId === suggestion.memoryId)
    if (signal) {
      updateSignal(signal.id, {
        createdKnowledgeId: created.id,
        knowledgeSuggestionPending: false,
        status: 'processed',
      })
      reloadFromStore()
    }
    return created.id
  }, [createKnowledge, signals, reloadFromStore])

  const getYesterdayCaptureSummary = useCallback((): string | null => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const date = yesterday.toISOString().slice(0, 10)
    const stats = getCaptureStatsForDate(date)
    if (stats.total === 0) return null
    const parts = [`You captured ${stats.total} signal${stats.total === 1 ? '' : 's'} yesterday.`]
    if (stats.ideas > 0) {
      parts.push(`${stats.ideas} idea${stats.ideas === 1 ? '' : 's'} — review in Inbox for strategic value.`)
    }
    if (stats.questions > 0) {
      parts.push(`${stats.questions} unanswered question${stats.questions === 1 ? '' : 's'}.`)
    }
    return parts.join(' ')
  }, [])

  const todaySignals = useMemo(() => {
    const today = todayISO()
    return signals.filter(s => s.timestamp.slice(0, 10) === today)
  }, [signals])

  const unprocessedCount = useMemo(
    () => signals.filter(s => s.status === 'new' || s.status === 'needs_review').length,
    [signals],
  )

  const value = useMemo<UniversalCaptureContextValue>(() => ({
    ready,
    signals,
    todaySignals,
    unprocessedCount,
    lastResult,
    captureOpen,
    openCapture: () => setCaptureOpen(true),
    closeCapture: () => setCaptureOpen(false),
    capture,
    markProcessed,
    markNeedsReview,
    archiveSignal,
    search: searchUnified,
    saveKnowledgeSuggestion,
    refresh: reloadFromStore,
    getYesterdayCaptureSummary,
  }), [
    ready, signals, todaySignals, unprocessedCount, lastResult, captureOpen,
    capture, markProcessed, markNeedsReview, archiveSignal,
    saveKnowledgeSuggestion, reloadFromStore, getYesterdayCaptureSummary,
  ])

  return (
    <UniversalCaptureContext.Provider value={value}>
      {children}
    </UniversalCaptureContext.Provider>
  )
}

export function useUniversalCapture() {
  const ctx = useContext(UniversalCaptureContext)
  if (!ctx) throw new Error('useUniversalCapture must be used within UniversalCaptureProvider')
  return ctx
}
