import type {
  CreateMemoryInput, LifeArea, MemoryImportance, MemoryRecord, MemoryType, UpdateMemoryInput,
} from './memoryTypes'
import { createSeedMemories } from './memorySeedData'
import { newMemoryId, nowISO } from './memoryUtils'
import { searchMemories as searchMemoriesFn, sortMemoriesByOccurred } from './memorySearch'
import { buildMemoryTimeline } from './memoryTimeline'

const STORAGE_KEY = 'founderos-memory-engine-v1'

export function getMemories(): MemoryRecord[] {
  return loadStore().memories
}

export function saveMemories(memories: MemoryRecord[]): void {
  persistStore({ memories })
}

function loadStore(): { memories: MemoryRecord[] } {
  if (typeof window === 'undefined') {
    return { memories: createSeedMemories() }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = { memories: createSeedMemories() }
      persistStore(seeded)
      return seeded
    }
    const parsed = JSON.parse(raw) as { memories?: MemoryRecord[] }
    return { memories: parsed.memories ?? [] }
  } catch {
    const seeded = { memories: createSeedMemories() }
    persistStore(seeded)
    return seeded
  }
}

function persistStore(store: { memories: MemoryRecord[] }): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function reloadMemoryStore(): { memories: MemoryRecord[] } {
  return loadStore()
}

export function getMemoryById(id: string): MemoryRecord | undefined {
  return getMemories().find(m => m.id === id)
}

export function getMemoriesByType(type: MemoryType): MemoryRecord[] {
  return getMemories().filter(m => m.type === type)
}

export function getMemoriesByArea(area: LifeArea): MemoryRecord[] {
  return getMemories().filter(m => m.area === area)
}

export function getMemoriesByImportance(importance: MemoryImportance): MemoryRecord[] {
  return getMemories().filter(m => m.importance === importance)
}

export function getMemoriesForObject(objectId: string): MemoryRecord[] {
  return getMemories().filter(m => m.relatedObjectIds.includes(objectId))
}

export function searchMemories(query: string): MemoryRecord[] {
  return sortMemoriesByOccurred(searchMemoriesFn(getMemories(), query))
}

export function getRecentMemories(limit = 10): MemoryRecord[] {
  return sortMemoriesByOccurred(getMemories()).slice(0, limit)
}

export function getMemoryTimeline(): ReturnType<typeof buildMemoryTimeline> {
  return buildMemoryTimeline(getMemories())
}

export function createMemory(input: CreateMemoryInput): MemoryRecord {
  const now = nowISO()
  const record: MemoryRecord = {
    id: input.id ?? newMemoryId(),
    type: input.type,
    title: input.title,
    content: input.content,
    summary: input.summary,
    importance: input.importance,
    area: input.area,
    source: input.source,
    relatedObjectIds: input.relatedObjectIds ?? [],
    tags: input.tags ?? [],
    occurredAt: input.occurredAt ?? now,
    createdAt: now,
    updatedAt: now,
  }
  saveMemories([record, ...getMemories()])
  return record
}

export function updateMemory(id: string, updates: UpdateMemoryInput): MemoryRecord | null {
  const memories = getMemories()
  const idx = memories.findIndex(m => m.id === id)
  if (idx === -1) return null
  const updated: MemoryRecord = {
    ...memories[idx],
    ...updates,
    relatedObjectIds: updates.relatedObjectIds ?? memories[idx].relatedObjectIds,
    tags: updates.tags ?? memories[idx].tags,
    updatedAt: nowISO(),
  }
  const next = [...memories]
  next[idx] = updated
  saveMemories(next)
  return updated
}

export function deleteMemory(id: string): void {
  saveMemories(getMemories().filter(m => m.id !== id))
}

/** Skip duplicate auto-memories with same dedupe key within a short window. */
export function hasRecentMemory(dedupeKey: string, withinMs = 3000): boolean {
  const memories = getMemories()
  const cutoff = Date.now() - withinMs
  return memories.some(m => {
    const key = m.tags.find(t => t.startsWith('dedupe:'))
    if (key !== `dedupe:${dedupeKey}`) return false
    return new Date(m.createdAt).getTime() > cutoff
  })
}
