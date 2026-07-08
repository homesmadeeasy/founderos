'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import type { CreateMemoryInput, LifeArea, MemoryImportance, MemoryRecord, MemoryType, UpdateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import {
  createMemory as storageCreate,
  deleteMemory as storageDelete,
  getMemoriesForObject as storageGetForObject,
  getMemoryTimeline as storageGetTimeline,
  getRecentMemories as storageGetRecent,
  hasRecentMemory,
  reloadMemoryStore,
  updateMemory as storageUpdate,
} from '@/lib/memory-engine/memoryStorage'
import { searchMemories, sortMemoriesByOccurred } from '@/lib/memory-engine/memorySearch'
import { generateMemorySummary, generateRecentMemoryDigest } from '@/lib/memory-engine/memorySummaries'
import type { MemoryTimelineGroup } from '@/lib/memory-engine/memoryTimeline'
import {
  memoryForObjectAction, type ObjectMemoryAction,
} from '@/lib/memory-engine/objectMemoryBridge'
import type { FounderObject, ObjectRelationship } from '@/lib/object-engine/objectTypes'

interface MemoryEngineContextValue {
  ready: boolean
  memories: MemoryRecord[]
  createMemory: (input: CreateMemoryInput) => MemoryRecord
  recordMemory: (input: CreateMemoryInput) => MemoryRecord | null
  updateMemory: (id: string, updates: UpdateMemoryInput) => MemoryRecord | null
  deleteMemory: (id: string) => void
  getRecentMemories: (limit?: number) => MemoryRecord[]
  searchMemories: (query: string, filters?: {
    type?: MemoryType | null
    area?: LifeArea | null
    importance?: MemoryImportance | null
  }) => MemoryRecord[]
  getMemoriesForObject: (objectId: string) => MemoryRecord[]
  getMemoryTimeline: () => MemoryTimelineGroup[]
  generateSummary: (memory: MemoryRecord) => string
  generateRecentDigest: (limit?: number) => string
  recordObjectAction: (
    action: ObjectMemoryAction,
    object: FounderObject,
    extra?: { relationship?: ObjectRelationship; previousTitle?: string },
  ) => void
  refresh: () => void
}

const MemoryEngineContext = createContext<MemoryEngineContextValue | null>(null)

function extractDedupeKey(tags: string[]): string | null {
  const tag = tags.find(t => t.startsWith('dedupe:'))
  return tag ? tag.slice('dedupe:'.length) : null
}

export function MemoryEngineProvider({ children }: { children: React.ReactNode }) {
  const [memories, setMemories] = useState<MemoryRecord[]>([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(() => {
    setMemories(reloadMemoryStore().memories)
  }, [])

  useEffect(() => {
    refresh()
    setReady(true)
  }, [refresh])

  const recordMemory = useCallback((input: CreateMemoryInput): MemoryRecord | null => {
    const dedupeKey = extractDedupeKey(input.tags ?? [])
    if (dedupeKey && hasRecentMemory(dedupeKey, 8000)) return null
    const created = storageCreate(input)
    refresh()
    return created
  }, [refresh])

  const createMemory = useCallback((input: CreateMemoryInput): MemoryRecord => {
    const created = storageCreate(input)
    refresh()
    return created
  }, [refresh])

  const updateMemory = useCallback((id: string, updates: UpdateMemoryInput) => {
    const updated = storageUpdate(id, updates)
    refresh()
    return updated
  }, [refresh])

  const deleteMemory = useCallback((id: string) => {
    storageDelete(id)
    refresh()
  }, [refresh])

  const getRecentMemoriesFn = useCallback((limit = 10) => {
    return storageGetRecent(limit)
  }, [])

  const searchMemoriesFn = useCallback((
    query: string,
    filters?: { type?: MemoryType | null; area?: LifeArea | null; importance?: MemoryImportance | null },
  ) => {
    return sortMemoriesByOccurred(searchMemories(memories, query, filters))
  }, [memories])

  const getMemoriesForObjectFn = useCallback((objectId: string) => {
    return storageGetForObject(objectId)
  }, [memories])

  const getMemoryTimelineFn = useCallback(() => storageGetTimeline(), [memories])

  const generateSummary = useCallback((memory: MemoryRecord) => generateMemorySummary(memory), [])

  const generateRecentDigest = useCallback((limit = 5) => generateRecentMemoryDigest(memories, limit), [memories])

  const recordObjectAction = useCallback((
    action: ObjectMemoryAction,
    object: FounderObject,
    extra?: { relationship?: ObjectRelationship; previousTitle?: string },
  ) => {
    recordMemory(memoryForObjectAction(action, object, extra))
  }, [recordMemory])

  const value = useMemo<MemoryEngineContextValue>(() => ({
    ready,
    memories,
    createMemory,
    recordMemory,
    updateMemory,
    deleteMemory,
    getRecentMemories: getRecentMemoriesFn,
    searchMemories: searchMemoriesFn,
    getMemoriesForObject: getMemoriesForObjectFn,
    getMemoryTimeline: getMemoryTimelineFn,
    generateSummary,
    generateRecentDigest,
    recordObjectAction,
    refresh,
  }), [
    ready, memories,
    createMemory, recordMemory, updateMemory, deleteMemory,
    getRecentMemoriesFn, searchMemoriesFn, getMemoriesForObjectFn,
    getMemoryTimelineFn, generateSummary, generateRecentDigest,
    recordObjectAction, refresh,
  ])

  return (
    <MemoryEngineContext.Provider value={value}>
      {children}
    </MemoryEngineContext.Provider>
  )
}

export function useMemoryEngine() {
  const ctx = useContext(MemoryEngineContext)
  if (!ctx) throw new Error('useMemoryEngine must be used within MemoryEngineProvider')
  return ctx
}

export function useMemoryEngineOptional() {
  return useContext(MemoryEngineContext)
}
