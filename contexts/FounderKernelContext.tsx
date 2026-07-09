'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { getKernelBus } from '@/lib/founder-kernel/kernelBus'
import { getKernelHistory } from '@/lib/founder-kernel/kernelHistory'
import { publishEvent } from '@/lib/founder-kernel/publishEvent'
import type {
  KernelExecution,
  KernelHistoryEntry,
  KernelSubscriber,
  PublishEventInput,
} from '@/lib/founder-kernel/kernelTypes'

interface FounderKernelContextValue {
  ready: boolean
  publish: (input: PublishEventInput) => Promise<KernelExecution>
  registerSubscriber: (subscriber: KernelSubscriber) => () => void
  history: KernelHistoryEntry[]
  lastExecution: KernelExecution | null
  refreshTick: number
  refreshHistory: () => void
}

const FounderKernelContext = createContext<FounderKernelContextValue | null>(null)

export function FounderKernelProvider({ children }: { children: React.ReactNode }) {
  const [refreshTick, setRefreshTick] = useState(0)
  const [lastExecution, setLastExecution] = useState<KernelExecution | null>(null)
  const [history, setHistory] = useState<KernelHistoryEntry[]>([])

  const refreshHistory = useCallback(() => {
    setHistory(getKernelHistory(100))
    setLastExecution(getKernelBus().getLastExecution())
  }, [])

  useEffect(() => {
    refreshHistory()
    return getKernelBus().onChange(() => {
      setRefreshTick(t => t + 1)
      refreshHistory()
    })
  }, [refreshHistory])

  const publish = useCallback((input: PublishEventInput) => publishEvent(input), [])

  const registerSubscriber = useCallback((subscriber: KernelSubscriber) => {
    return getKernelBus().subscribe(subscriber)
  }, [])

  const value = useMemo<FounderKernelContextValue>(() => ({
    ready: true,
    publish,
    registerSubscriber,
    history,
    lastExecution,
    refreshTick,
    refreshHistory,
  }), [publish, registerSubscriber, history, lastExecution, refreshTick, refreshHistory])

  return (
    <FounderKernelContext.Provider value={value}>
      {children}
    </FounderKernelContext.Provider>
  )
}

export function useFounderKernel() {
  const ctx = useContext(FounderKernelContext)
  if (!ctx) throw new Error('useFounderKernel must be used within FounderKernelProvider')
  return ctx
}

export function useFounderKernelOptional() {
  return useContext(FounderKernelContext)
}
