import type {
  CreateObjectInput, FounderObject, LifeArea, FounderObjectType,
  ObjectRelationship, RelationshipType, UpdateObjectInput,
} from './objectTypes'
import { newObjectId, nowISO } from './objectUtils'
import { createSeedObjects } from './objectSeedData'

const STORAGE_KEY = 'founderos-object-engine-v1'

export interface ObjectEngineStore {
  objects: FounderObject[]
}

export function getObjects(): FounderObject[] {
  return loadStore().objects
}

export function saveObjects(objects: FounderObject[]): void {
  persistStore({ objects })
}

function loadStore(): ObjectEngineStore {
  if (typeof window === 'undefined') {
    return { objects: createSeedObjects() }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = { objects: createSeedObjects() }
      persistStore(seeded)
      return seeded
    }
    const parsed = JSON.parse(raw) as ObjectEngineStore
    return { objects: parsed.objects ?? [] }
  } catch {
    const seeded = { objects: createSeedObjects() }
    persistStore(seeded)
    return seeded
  }
}

function persistStore(store: ObjectEngineStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getObjectById(id: string): FounderObject | undefined {
  return getObjects().find(o => o.id === id)
}

export function getObjectsByType(type: FounderObjectType): FounderObject[] {
  return getObjects().filter(o => o.type === type)
}

export function getObjectsByArea(area: LifeArea): FounderObject[] {
  return getObjects().filter(o => o.area === area)
}

export function createObject(input: CreateObjectInput): FounderObject {
  const now = nowISO()
  const object: FounderObject = {
    id: input.id ?? newObjectId(),
    type: input.type,
    title: input.title,
    summary: input.summary,
    content: input.content,
    area: input.area,
    status: input.status ?? 'active',
    priority: input.priority,
    tags: input.tags ?? [],
    source: input.source ?? 'manual',
    metadata: input.metadata ?? {},
    relationships: input.relationships ?? [],
    aiSummary: input.aiSummary,
    createdAt: now,
    updatedAt: now,
  }
  const objects = [object, ...getObjects()]
  saveObjects(objects)
  return object
}

export function updateObject(id: string, updates: UpdateObjectInput): FounderObject | null {
  const objects = getObjects()
  const idx = objects.findIndex(o => o.id === id)
  if (idx === -1) return null
  const updated: FounderObject = {
    ...objects[idx],
    ...updates,
    tags: updates.tags ?? objects[idx].tags,
    metadata: updates.metadata ?? objects[idx].metadata,
    relationships: updates.relationships ?? objects[idx].relationships,
    updatedAt: nowISO(),
  }
  const next = [...objects]
  next[idx] = updated
  saveObjects(next)
  return updated
}

export function deleteObject(id: string): void {
  const objects = getObjects()
    .filter(o => o.id !== id)
    .map(o => ({
      ...o,
      relationships: o.relationships.filter(
        r => r.fromObjectId !== id && r.toObjectId !== id,
      ),
    }))
  saveObjects(objects)
}

export function createRelationship(
  fromId: string,
  toId: string,
  type: RelationshipType,
  strength?: number,
): ObjectRelationship | null {
  const objects = getObjects()
  const fromIdx = objects.findIndex(o => o.id === fromId)
  const toIdx = objects.findIndex(o => o.id === toId)
  if (fromIdx === -1 || toIdx === -1) return null

  const rel: ObjectRelationship = {
    id: newObjectId(),
    fromObjectId: fromId,
    toObjectId: toId,
    type,
    strength,
    createdAt: nowISO(),
  }

  const next = objects.map((o, i) => {
    if (i === fromIdx) {
      return { ...o, relationships: [...o.relationships, rel], updatedAt: nowISO() }
    }
    return o
  })
  saveObjects(next)
  return rel
}

export function deleteRelationship(relationshipId: string): void {
  const next = getObjects().map(o => ({
    ...o,
    relationships: o.relationships.filter(r => r.id !== relationshipId),
    updatedAt: o.relationships.some(r => r.id === relationshipId) ? nowISO() : o.updatedAt,
  }))
  saveObjects(next)
}

/** Replace entire store — used by React context after mutations. */
export function replaceObjects(objects: FounderObject[]): void {
  saveObjects(objects)
}

export function reloadStore(): ObjectEngineStore {
  return loadStore()
}
