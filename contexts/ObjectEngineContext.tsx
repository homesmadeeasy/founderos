'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import {
  captureToObjectInput, projectToObjectInput, taskToObjectInput,
} from '@/lib/object-engine/commandCenterBridge'
import type { CCCaptureItem, CCProject, CCTask } from '@/lib/command-center/types'
import {
  createObject as storageCreate,
  createRelationship as storageCreateRel,
  deleteObject as storageDelete,
  deleteRelationship as storageDeleteRel,
  getObjectById as storageGetById,
  reloadStore,
  updateObject as storageUpdate,
} from '@/lib/object-engine/objectStorage'
import { searchObjects, sortObjectsByUpdated } from '@/lib/object-engine/objectSearch'
import { generateObjectSummary } from '@/lib/object-engine/objectSummaries'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import type {
  CreateObjectInput, FounderObject, FounderObjectType, LifeArea,
  ObjectRelationship, RelationshipType, UpdateObjectInput,
} from '@/lib/object-engine/objectTypes'

interface ObjectEngineContextValue {
  ready: boolean
  objects: FounderObject[]
  createObject: (input: CreateObjectInput) => FounderObject
  updateObject: (id: string, updates: UpdateObjectInput) => FounderObject | null
  deleteObject: (id: string) => void
  createRelationship: (fromId: string, toId: string, type: RelationshipType, strength?: number) => ObjectRelationship | null
  deleteRelationship: (relationshipId: string) => void
  getObjectById: (id: string) => FounderObject | undefined
  getObjectsByType: (type: FounderObjectType) => FounderObject[]
  getObjectsByArea: (area: LifeArea) => FounderObject[]
  searchObjects: (query: string, filters?: { type?: FounderObjectType | null; area?: LifeArea | null }) => FounderObject[]
  generateSummary: (object: FounderObject) => string
  syncTaskFromCommandCenter: (task: CCTask) => void
  syncProjectFromCommandCenter: (project: CCProject) => void
  syncCaptureFromCommandCenter: (capture: CCCaptureItem) => void
  syncDeleteFromCommandCenter: (id: string) => void
  refresh: () => void
}

const ObjectEngineContext = createContext<ObjectEngineContextValue | null>(null)

export function ObjectEngineProvider({ children }: { children: React.ReactNode }) {
  const [objects, setObjects] = useState<FounderObject[]>([])
  const [ready, setReady] = useState(false)
  const memoryEngine = useMemoryEngine()

  const refresh = useCallback(() => {
    setObjects(reloadStore().objects)
  }, [])

  useEffect(() => {
    refresh()
    setReady(true)
  }, [refresh])
  const persist = useCallback((updater: () => void) => {
    updater()
    refresh()
  }, [refresh])

  const createObject = useCallback((input: CreateObjectInput) => {
    const created = storageCreate(input)
    memoryEngine.recordObjectAction('created', created)
    refresh()
    return created
  }, [refresh, memoryEngine])

  const updateObject = useCallback((id: string, updates: UpdateObjectInput) => {
    const prev = storageGetById(id)
    const updated = storageUpdate(id, updates)
    if (updated && prev && (updates.title || updates.status || updates.type || updates.area)) {
      memoryEngine.recordObjectAction('updated', updated, { previousTitle: prev.title })
    }
    refresh()
    return updated
  }, [refresh, memoryEngine])

  const deleteObject = useCallback((id: string) => {
    const existing = storageGetById(id)
    persist(() => storageDelete(id))
    if (existing) memoryEngine.recordObjectAction('deleted', existing)
  }, [persist, memoryEngine])

  const createRelationship = useCallback((
    fromId: string, toId: string, type: RelationshipType, strength?: number,
  ) => {
    const from = storageGetById(fromId)
    const rel = storageCreateRel(fromId, toId, type, strength)
    if (rel && from) memoryEngine.recordObjectAction('relationship_created', from, { relationship: rel })
    refresh()
    return rel
  }, [refresh, memoryEngine])

  const deleteRelationship = useCallback((relationshipId: string) => {
    persist(() => storageDeleteRel(relationshipId))
  }, [persist])

  const getObjectById = useCallback((id: string) => {
    return objects.find(o => o.id === id) ?? storageGetById(id)
  }, [objects])

  const getObjectsByTypeFn = useCallback((type: FounderObjectType) => {
    return objects.filter(o => o.type === type)
  }, [objects])

  const getObjectsByAreaFn = useCallback((area: LifeArea) => {
    return objects.filter(o => o.area === area)
  }, [objects])

  const searchObjectsFn = useCallback((
    query: string,
    filters?: { type?: FounderObjectType | null; area?: LifeArea | null },
  ) => {
    return sortObjectsByUpdated(searchObjects(objects, query, filters))
  }, [objects])

  const generateSummary = useCallback((object: FounderObject) => {
    return generateObjectSummary(object, objects, objects)
  }, [objects])

  const syncTaskFromCommandCenter = useCallback((task: CCTask) => {
    persist(() => {
      const input = taskToObjectInput(task)
      const existing = storageGetById(task.id)
      if (existing) storageUpdate(task.id, input)
      else storageCreate(input)
    })
  }, [persist])

  const syncProjectFromCommandCenter = useCallback((project: CCProject) => {
    persist(() => {
      const input = projectToObjectInput(project)
      const existing = storageGetById(project.id)
      if (existing) storageUpdate(project.id, input)
      else storageCreate(input)
    })
  }, [persist])

  const syncCaptureFromCommandCenter = useCallback((capture: CCCaptureItem) => {
    persist(() => {
      const input = captureToObjectInput(capture)
      const existing = storageGetById(capture.id)
      if (existing) storageUpdate(capture.id, input)
      else storageCreate(input)
    })
  }, [persist])

  const syncDeleteFromCommandCenter = useCallback((id: string) => {
    persist(() => {
      if (storageGetById(id)) storageDelete(id)
    })
  }, [persist])

  const value = useMemo<ObjectEngineContextValue>(() => ({
    ready,
    objects,
    createObject,
    updateObject,
    deleteObject,
    createRelationship,
    deleteRelationship,
    getObjectById,
    getObjectsByType: getObjectsByTypeFn,
    getObjectsByArea: getObjectsByAreaFn,
    searchObjects: searchObjectsFn,
    generateSummary,
    syncTaskFromCommandCenter,
    syncProjectFromCommandCenter,
    syncCaptureFromCommandCenter,
    syncDeleteFromCommandCenter,
    refresh,
  }), [
    ready, objects,
    createObject, updateObject, deleteObject,
    createRelationship, deleteRelationship,
    getObjectById, getObjectsByTypeFn, getObjectsByAreaFn,
    searchObjectsFn, generateSummary,
    syncTaskFromCommandCenter, syncProjectFromCommandCenter,
    syncCaptureFromCommandCenter, syncDeleteFromCommandCenter,
    refresh,
  ])

  return (
    <ObjectEngineContext.Provider value={value}>
      {children}
    </ObjectEngineContext.Provider>
  )
}

export function useObjectEngine() {
  const ctx = useContext(ObjectEngineContext)
  if (!ctx) throw new Error('useObjectEngine must be used within ObjectEngineProvider')
  return ctx
}

/** Optional hook for components that may render outside the provider. */
export function useObjectEngineOptional() {
  return useContext(ObjectEngineContext)
}
