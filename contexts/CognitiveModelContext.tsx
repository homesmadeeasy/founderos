'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import type { CognitiveInsight, CognitiveStore, RawCognitiveInput, WorldModel } from '@/lib/cognitive-model/beliefTypes'
import { loadCognitiveStore } from '@/lib/cognitive-model/beliefStorage'
import {
  getCognitiveStore,
  reconcileCognitiveModel,
  persistCognitiveStore,
  handleKernelEventForCognitive,
  setCognitiveStore,
} from '@/lib/cognitive-model/cognitiveOrchestrator'
import { compactStoredCognitiveModel, getCognitiveStoreStats } from '@/lib/cognitive-model/cognitiveCompaction'
import { buildCognitiveInsight } from '@/lib/cognitive-model/cognitiveSummary'
import { createCognitiveReasoner } from '@/lib/cognitive-model/cognitiveConversation'
import { setConversationReasoner } from '@/lib/conversation/conversationEngine'
import { useFounderBaseInput } from '@/components/founder/useFounderBaseInput'
import { mergeFounderInputWithWorldModel } from '@/lib/specialists/founder/founderInputBuilder'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { buildRawCognitiveInputFromFounder } from '@/lib/cognitive-model/cognitiveInputBuilder'
import { normalizeCognitiveInput } from '@/lib/cognitive-model/cognitiveInputNormalize'
import { cognitiveInputFingerprint } from '@/lib/cognitive-model/cognitiveUtils'
import { getStorageWarning } from '@/lib/cognitive-model/cognitiveMemory'
import type { FounderEvent } from '@/lib/founder-kernel/kernelTypes'
import type { FounderInput } from '@/lib/specialists/founder/founderTypes'

interface CognitiveModelContextValue {
  ready: boolean
  hydrated: boolean
  store: CognitiveStore
  worldModel: WorldModel
  insight: CognitiveInsight
  storageWarning: string | null
  refresh: () => void
  reconcile: () => void
  compactStorage: () => { beforeBytes: number; afterBytes: number }
  processKernelEvent: (event: FounderEvent) => void
}

const CognitiveModelContext = createContext<CognitiveModelContextValue | null>(null)

export function CognitiveModelProvider({ children }: { children: React.ReactNode }) {
  // Dependency inversion: consume base engine input only — never useFounderInput(),
  // because useFounderInput() calls useCognitiveModel() and would read this
  // provider's context before it exists (provider cycle).
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    void ('CognitiveModelProvider must use useFounderBaseInput, not useFounderInput')
  }
  const founderBaseInput = useFounderBaseInput()
  const { publish } = useFounderKernel()
  const { ready: morningReady } = useMorningExecution()
  const { ready: memoriesReady } = useMemoryEngine()
  const { ready: knowledgeReady } = useKnowledgeEngine()
  const { ready: objectsReady } = useObjectEngine()

  const enginesReady = morningReady && memoriesReady && knowledgeReady && objectsReady

  const [store, setStore] = useState<CognitiveStore>(() => loadCognitiveStore())
  const [ready, setReady] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [storageWarning, setStorageWarningState] = useState<string | null>(getStorageWarning())

  const inputRef = useRef<FounderInput>(mergeFounderInputWithWorldModel(founderBaseInput, null, false))

  const rawInput = useMemo<RawCognitiveInput>(
    () => buildRawCognitiveInputFromFounder(founderBaseInput),
    [founderBaseInput],
  )

  const inputFingerprint = useMemo(
    () => cognitiveInputFingerprint(normalizeCognitiveInput(rawInput)),
    [rawInput],
  )

  const lastFingerprintRef = useRef<string | null>(null)
  const reasonerInstalledRef = useRef(false)
  const publishingKernelRef = useRef(false)

  const refresh = useCallback(() => {
    setStore(getCognitiveStore())
    setStorageWarningState(getStorageWarning())
  }, [])

  const reconcile = useCallback((force = false) => {
    if (!force && lastFingerprintRef.current === inputFingerprint) return
    const next = reconcileCognitiveModel(rawInput, { force, skipPersist: true })
    setStore(next)
    setCognitiveStore(next)
    const persistResult = persistCognitiveStore(next, { force })
    if (persistResult.warning) setStorageWarningState(persistResult.warning)
    lastFingerprintRef.current = inputFingerprint
    if (process.env.NODE_ENV === 'development') {
      console.info('[cognitive-model] reconciled', {
        ...getCognitiveStoreStats(next),
        skipped: persistResult.skipped,
        pruned: persistResult.pruned,
      })
    }
  }, [rawInput, inputFingerprint])

  const compactStorage = useCallback(() => {
    const report = compactStoredCognitiveModel(getCognitiveStore())
    setCognitiveStore(report.store)
    setStore(report.store)
    const result = persistCognitiveStore(report.store, { force: true })
    if (result.warning) setStorageWarningState(result.warning)
    return { beforeBytes: report.beforeBytes, afterBytes: report.afterBytes }
  }, [])

  const processKernelEvent = useCallback((event: FounderEvent) => {
    if (event.type === 'CognitiveModelUpdated') return
    const next = handleKernelEventForCognitive(event)
    if (!next) return
    setStore(next)
    setCognitiveStore(next)
    if (publishingKernelRef.current) return
    publishingKernelRef.current = true
    void publish({
      type: 'CognitiveModelUpdated',
      source: 'cognitive-model',
      payload: { beliefCount: next.worldModel.beliefs.length },
    }).finally(() => {
      publishingKernelRef.current = false
    })
  }, [publish])

  useEffect(() => {
    inputRef.current = mergeFounderInputWithWorldModel(founderBaseInput, store.worldModel, hydrated)
  }, [founderBaseInput, store.worldModel, hydrated])

  useEffect(() => {
    if (!reasonerInstalledRef.current) {
      setConversationReasoner(createCognitiveReasoner(() => inputRef.current))
      reasonerInstalledRef.current = true
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    setHydrated(true)
  }, [ready])

  useEffect(() => {
    if (!enginesReady || !ready) return
    reconcile(false)
  }, [enginesReady, ready, inputFingerprint, reconcile])

  const insight = useMemo(() => buildCognitiveInsight(store.worldModel), [store.worldModel])

  const value = useMemo<CognitiveModelContextValue>(() => ({
    ready,
    hydrated,
    store,
    worldModel: store.worldModel,
    insight,
    storageWarning,
    refresh,
    reconcile: () => reconcile(false),
    compactStorage,
    processKernelEvent,
  }), [ready, hydrated, store, insight, storageWarning, refresh, reconcile, compactStorage, processKernelEvent])

  return (
    <CognitiveModelContext.Provider value={value}>
      {children}
    </CognitiveModelContext.Provider>
  )
}

export function useCognitiveModel(): CognitiveModelContextValue {
  const ctx = useContext(CognitiveModelContext)
  if (!ctx) throw new Error('useCognitiveModel must be used within CognitiveModelProvider')
  return ctx
}

export function useCognitiveInsight(): CognitiveInsight {
  return useCognitiveModel().insight
}
