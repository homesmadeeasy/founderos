'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import {
  createMockSignal,
  createSignalFromCapture,
  ingestSignal,
  processSignal,
} from '@/lib/signal-engine/signalPipeline'
import {
  buildMorningSignalNotes,
  buildSignalSummary,
  searchSignals as searchSignalsFn,
} from '@/lib/signal-engine/signalSearch'
import {
  ensureSignalSeed,
  reloadSignalStore,
} from '@/lib/signal-engine/signalStorage'
import type { CreateSignalInput, Signal, SignalSource, SignalType } from '@/lib/signal-engine/signalTypes'

interface SignalEngineContextValue {
  ready: boolean
  signals: Signal[]
  todaySignals: Signal[]
  summary: ReturnType<typeof buildSignalSummary>
  morningNotes: string[]
  searchSignals: (query: string, filters?: { source?: SignalSource | null; type?: SignalType | null }) => Signal[]
  createSignal: (input: CreateSignalInput) => Signal
  addMockSignal: () => Signal
  processSignalById: (id: string) => Signal | null
  ingestFromCapture: (capture: Parameters<typeof createSignalFromCapture>[0]) => Signal
  refresh: () => void
}

const SignalEngineContext = createContext<SignalEngineContextValue | null>(null)

export function SignalEngineProvider({ children }: { children: React.ReactNode }) {
  const { recordMemory, ready: memoriesReady } = useMemoryEngine()
  const [signals, setSignals] = useState<Signal[]>([])

  const reloadFromStore = useCallback(() => {
    ensureSignalSeed()
    setSignals(reloadSignalStore().signals)
  }, [])

  useEffect(() => {
    if (!memoriesReady) return
    reloadFromStore()
  }, [memoriesReady, reloadFromStore])

  const memoryDeps = useMemo(() => ({ recordMemory }), [recordMemory])

  const createSignalFn = useCallback((input: CreateSignalInput) => {
    const created = ingestSignal(input, memoryDeps)
    reloadFromStore()
    return created
  }, [memoryDeps, reloadFromStore])

  const addMockSignal = useCallback(() => {
    const created = createMockSignal({
      title: `Mock signal ${signals.length + 1}`,
      content: 'Simulated external signal for Connected Reality testing.',
      source: 'future_api',
      type: 'system',
    })
    reloadFromStore()
    return created
  }, [signals.length, reloadFromStore])

  const processSignalById = useCallback((id: string) => {
    const result = processSignal(id, memoryDeps)
    reloadFromStore()
    return result
  }, [memoryDeps, reloadFromStore])

  const ingestFromCapture = useCallback((capture: Parameters<typeof createSignalFromCapture>[0]) => {
    const created = createSignalFromCapture(capture, memoryDeps)
    reloadFromStore()
    return created
  }, [memoryDeps, reloadFromStore])

  const todaySignals = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return signals.filter(s => s.timestamp.slice(0, 10) === today)
  }, [signals])
  const summary = useMemo(() => buildSignalSummary(signals), [signals])
  const morningNotes = useMemo(() => buildMorningSignalNotes(signals), [signals])

  const value = useMemo<SignalEngineContextValue>(() => ({
    ready: memoriesReady,
    signals,
    todaySignals,
    summary,
    morningNotes,
    searchSignals: (query, filters) => searchSignalsFn(query, filters),
    createSignal: createSignalFn,
    addMockSignal,
    processSignalById,
    ingestFromCapture,
    refresh: reloadFromStore,
  }), [
    memoriesReady, signals, todaySignals, summary, morningNotes,
    createSignalFn, addMockSignal, processSignalById, ingestFromCapture, reloadFromStore,
  ])

  return (
    <SignalEngineContext.Provider value={value}>
      {children}
    </SignalEngineContext.Provider>
  )
}

export function useSignalEngine() {
  const ctx = useContext(SignalEngineContext)
  if (!ctx) throw new Error('useSignalEngine must be used within SignalEngineProvider')
  return ctx
}
