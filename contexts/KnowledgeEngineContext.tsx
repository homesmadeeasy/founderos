'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import type {
  CreateKnowledgeInput,
  KnowledgeDomain,
  KnowledgeRecord,
  KnowledgeSuggestion,
  UpdateKnowledgeInput,
} from '@/lib/knowledge-engine/knowledgeTypes'
import {
  createKnowledge as storageCreate,
  deleteKnowledge as storageDelete,
  getKnowledgeByDomain as storageGetByDomain,
  getKnowledgeForMemory as storageGetForMemory,
  getKnowledgeForObject as storageGetForObject,
  incrementKnowledgeUsage as storageIncrementUsage,
  reloadKnowledgeStore,
  updateKnowledge as storageUpdate,
} from '@/lib/knowledge-engine/knowledgeStorage'
import { searchKnowledgeRecords } from '@/lib/knowledge-engine/knowledgeSearch'
import { generateKnowledgeSummary } from '@/lib/knowledge-engine/knowledgeSummaries'
import {
  createKnowledgeFromMemory as bridgeCreateFromMemory,
  suggestKnowledgeFromMemory,
  suggestKnowledgeFromMemories,
} from '@/lib/knowledge-engine/memoryKnowledgeBridge'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'

interface KnowledgeEngineContextValue {
  ready: boolean
  knowledge: KnowledgeRecord[]
  createKnowledge: (input: CreateKnowledgeInput) => KnowledgeRecord
  updateKnowledge: (id: string, updates: UpdateKnowledgeInput) => KnowledgeRecord | null
  deleteKnowledge: (id: string) => void
  searchKnowledge: (
    query: string,
    filters?: {
      type?: KnowledgeRecord['type'] | null
      domain?: KnowledgeDomain | null
      confidence?: KnowledgeRecord['confidence'] | null
    },
  ) => KnowledgeRecord[]
  getKnowledgeByDomain: (domain: KnowledgeDomain) => KnowledgeRecord[]
  getKnowledgeForMemory: (memoryId: string) => KnowledgeRecord[]
  getKnowledgeForObject: (objectId: string) => KnowledgeRecord[]
  suggestKnowledgeFromMemory: (memory: MemoryRecord) => KnowledgeSuggestion | null
  getSuggestedFromMemories: (limit?: number) => KnowledgeSuggestion[]
  createKnowledgeFromMemory: (
    memoryId: string,
    input?: Partial<CreateKnowledgeInput>,
  ) => KnowledgeRecord | null
  incrementKnowledgeUsage: (id: string) => KnowledgeRecord | null
  generateSummary: (record: KnowledgeRecord) => string
  refresh: () => void
}

const KnowledgeEngineContext = createContext<KnowledgeEngineContextValue | null>(null)

export function KnowledgeEngineProvider({ children }: { children: React.ReactNode }) {
  const { memories, ready: memoriesReady } = useMemoryEngine()
  const [knowledge, setKnowledge] = useState<KnowledgeRecord[]>([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(() => {
    setKnowledge(reloadKnowledgeStore().knowledge)
  }, [])

  useEffect(() => {
    refresh()
    setReady(true)
  }, [refresh])

  const createKnowledge = useCallback((input: CreateKnowledgeInput) => {
    const created = storageCreate(input)
    refresh()
    return created
  }, [refresh])

  const updateKnowledge = useCallback((id: string, updates: UpdateKnowledgeInput) => {
    const updated = storageUpdate(id, updates)
    refresh()
    return updated
  }, [refresh])

  const deleteKnowledge = useCallback((id: string) => {
    storageDelete(id)
    refresh()
  }, [refresh])

  const searchKnowledge = useCallback((
    query: string,
    filters?: {
      type?: KnowledgeRecord['type'] | null
      domain?: KnowledgeDomain | null
      confidence?: KnowledgeRecord['confidence'] | null
    },
  ) => searchKnowledgeRecords(knowledge, query, filters), [knowledge])

  const getKnowledgeByDomain = useCallback(
    (domain: KnowledgeDomain) => storageGetByDomain(domain),
    [knowledge],
  )

  const getKnowledgeForMemory = useCallback(
    (memoryId: string) => storageGetForMemory(memoryId),
    [knowledge],
  )

  const getKnowledgeForObject = useCallback(
    (objectId: string) => storageGetForObject(objectId),
    [knowledge],
  )

  const suggestFromMemory = useCallback(
    (memory: MemoryRecord) => suggestKnowledgeFromMemory(memory, memories),
    [memories],
  )

  const getSuggestedFromMemories = useCallback(
    (limit = 5) => suggestKnowledgeFromMemories(memories, limit),
    [memories],
  )

  const createKnowledgeFromMemory = useCallback((
    memoryId: string,
    input?: Partial<CreateKnowledgeInput>,
  ) => {
    const created = bridgeCreateFromMemory(memoryId, input)
    if (created) refresh()
    return created
  }, [refresh])

  const incrementKnowledgeUsage = useCallback((id: string) => {
    const updated = storageIncrementUsage(id)
    refresh()
    return updated
  }, [refresh])

  const generateSummary = useCallback(
    (record: KnowledgeRecord) => generateKnowledgeSummary(record),
    [],
  )

  const value = useMemo<KnowledgeEngineContextValue>(() => ({
    ready: ready && memoriesReady,
    knowledge,
    createKnowledge,
    updateKnowledge,
    deleteKnowledge,
    searchKnowledge,
    getKnowledgeByDomain,
    getKnowledgeForMemory,
    getKnowledgeForObject,
    suggestKnowledgeFromMemory: suggestFromMemory,
    getSuggestedFromMemories,
    createKnowledgeFromMemory,
    incrementKnowledgeUsage,
    generateSummary,
    refresh,
  }), [
    ready, memoriesReady, knowledge,
    createKnowledge, updateKnowledge, deleteKnowledge,
    searchKnowledge, getKnowledgeByDomain, getKnowledgeForMemory,
    getKnowledgeForObject, suggestFromMemory, getSuggestedFromMemories,
    createKnowledgeFromMemory, incrementKnowledgeUsage, generateSummary, refresh,
  ])

  return (
    <KnowledgeEngineContext.Provider value={value}>
      {children}
    </KnowledgeEngineContext.Provider>
  )
}

export function useKnowledgeEngine() {
  const ctx = useContext(KnowledgeEngineContext)
  if (!ctx) throw new Error('useKnowledgeEngine must be used within KnowledgeEngineProvider')
  return ctx
}
