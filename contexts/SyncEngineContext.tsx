'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import {
  ADAPTER_CARDS,
  connectMockAdapter,
  disconnectAdapter,
  getAdapterConnections,
  type AdapterId,
} from '@/lib/source-adapters/adapterRegistry'
import type { AdapterConnectionState } from '@/lib/source-adapters/adapterTypes'
import { runAllSyncs, runSync } from '@/lib/sync-engine/syncRunner'
import { scheduleMockSync } from '@/lib/sync-engine/syncScheduler'
import {
  getLastGlobalSyncAt,
  getSyncHistory,
  reloadSyncStore,
} from '@/lib/sync-engine/syncStorage'
import type { SyncJob, SyncResult } from '@/lib/sync-engine/syncTypes'
import { formatSignalTimestamp } from '@/lib/signal-engine/signalFormat'

interface SyncEngineContextValue {
  ready: boolean
  adapters: AdapterConnectionState[]
  adapterCards: typeof ADAPTER_CARDS
  syncHistory: SyncJob[]
  lastGlobalSyncAt?: string
  lastGlobalSyncLabel: string
  syncing: boolean
  connectMock: (adapterId: string) => void
  disconnect: (adapterId: string) => void
  syncNow: (adapterId: string) => Promise<SyncResult>
  syncAll: () => Promise<SyncResult[]>
  scheduleMockSync: () => Promise<SyncResult[]>
  refresh: () => void
}

const SyncEngineContext = createContext<SyncEngineContextValue | null>(null)

export function SyncEngineProvider({ children }: { children: React.ReactNode }) {
  const { recordMemory, ready: memoriesReady } = useMemoryEngine()
  const { refresh: refreshSignals, ready: signalsReady } = useSignalEngine()

  const [adapters, setAdapters] = useState<AdapterConnectionState[]>([])
  const [syncHistory, setSyncHistory] = useState<SyncJob[]>([])
  const [lastGlobalSyncAt, setLastGlobalSyncAtState] = useState<string | undefined>()
  const [syncing, setSyncing] = useState(false)

  const ready = memoriesReady && signalsReady

  const reloadFromStore = useCallback(() => {
    reloadSyncStore()
    setAdapters(getAdapterConnections())
    setSyncHistory(getSyncHistory())
    setLastGlobalSyncAtState(getLastGlobalSyncAt())
  }, [])

  useEffect(() => {
    if (!ready) return
    reloadFromStore()
  }, [ready, reloadFromStore])

  const syncDeps = useMemo(() => ({ recordMemory }), [recordMemory])

  const connectMock = useCallback((adapterId: string) => {
    connectMockAdapter(adapterId)
    reloadFromStore()
  }, [reloadFromStore])

  const disconnect = useCallback((adapterId: string) => {
    disconnectAdapter(adapterId)
    reloadFromStore()
  }, [reloadFromStore])

  const syncNow = useCallback(async (adapterId: string) => {
    setSyncing(true)
    try {
      const result = await runSync(adapterId, syncDeps)
      reloadFromStore()
      refreshSignals()
      return result
    } finally {
      setSyncing(false)
    }
  }, [syncDeps, reloadFromStore, refreshSignals])

  const syncAll = useCallback(async () => {
    setSyncing(true)
    try {
      const results = await runAllSyncs(syncDeps)
      reloadFromStore()
      refreshSignals()
      return results
    } finally {
      setSyncing(false)
    }
  }, [syncDeps, reloadFromStore, refreshSignals])

  const scheduleMockSyncFn = useCallback(async () => {
    setSyncing(true)
    try {
      const results = await scheduleMockSync(syncDeps)
      reloadFromStore()
      refreshSignals()
      return results
    } finally {
      setSyncing(false)
    }
  }, [syncDeps, reloadFromStore, refreshSignals])

  const value = useMemo<SyncEngineContextValue>(() => ({
    ready,
    adapters,
    adapterCards: ADAPTER_CARDS,
    syncHistory,
    lastGlobalSyncAt,
    lastGlobalSyncLabel: formatSignalTimestamp(lastGlobalSyncAt),
    syncing,
    connectMock,
    disconnect,
    syncNow,
    syncAll,
    scheduleMockSync: scheduleMockSyncFn,
    refresh: reloadFromStore,
  }), [
    ready, adapters, syncHistory, lastGlobalSyncAt, syncing,
    connectMock, disconnect, syncNow, syncAll, scheduleMockSyncFn, reloadFromStore,
  ])

  return (
    <SyncEngineContext.Provider value={value}>
      {children}
    </SyncEngineContext.Provider>
  )
}

export function useSyncEngine() {
  const ctx = useContext(SyncEngineContext)
  if (!ctx) throw new Error('useSyncEngine must be used within SyncEngineProvider')
  return ctx
}

export type { AdapterId }
