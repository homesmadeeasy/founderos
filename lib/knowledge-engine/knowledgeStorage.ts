import type { CreateKnowledgeInput, KnowledgeRecord, UpdateKnowledgeInput } from './knowledgeTypes'
import { createSeedKnowledge } from './knowledgeSeedData'
import { searchKnowledgeRecords } from './knowledgeSearch'
import { newKnowledgeId, nowISO } from './knowledgeUtils'

const STORAGE_KEY = 'founderos-knowledge-engine-v1'

function loadStore(): { knowledge: KnowledgeRecord[] } {
  if (typeof window === 'undefined') {
    return { knowledge: createSeedKnowledge() }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = { knowledge: createSeedKnowledge() }
      persistStore(seeded)
      return seeded
    }
    const parsed = JSON.parse(raw) as { knowledge?: KnowledgeRecord[] }
    return { knowledge: parsed.knowledge ?? [] }
  } catch {
    const seeded = { knowledge: createSeedKnowledge() }
    persistStore(seeded)
    return seeded
  }
}

function persistStore(store: { knowledge: KnowledgeRecord[] }): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function reloadKnowledgeStore(): { knowledge: KnowledgeRecord[] } {
  return loadStore()
}

export function getKnowledge(): KnowledgeRecord[] {
  return loadStore().knowledge
}

export function saveKnowledge(records: KnowledgeRecord[]): void {
  persistStore({ knowledge: records })
}

export function getKnowledgeById(id: string): KnowledgeRecord | undefined {
  return getKnowledge().find(k => k.id === id)
}

export function getKnowledgeByType(
  type: KnowledgeRecord['type'],
): KnowledgeRecord[] {
  return getKnowledge().filter(k => k.type === type)
}

export function getKnowledgeByDomain(
  domain: NonNullable<KnowledgeRecord['domain']>,
): KnowledgeRecord[] {
  return getKnowledge().filter(k => k.domain === domain)
}

export function getKnowledgeForMemory(memoryId: string): KnowledgeRecord[] {
  return getKnowledge().filter(k => k.relatedMemoryIds.includes(memoryId))
}

export function getKnowledgeForObject(objectId: string): KnowledgeRecord[] {
  return getKnowledge().filter(k => k.relatedObjectIds.includes(objectId))
}

export function searchKnowledge(query: string): KnowledgeRecord[] {
  return searchKnowledgeRecords(getKnowledge(), query)
}

export function createKnowledge(input: CreateKnowledgeInput): KnowledgeRecord {
  const now = nowISO()
  const record: KnowledgeRecord = {
    ...input,
    id: input.id ?? newKnowledgeId(),
    usageCount: input.usageCount ?? 0,
    relatedObjectIds: input.relatedObjectIds ?? [],
    relatedMemoryIds: input.relatedMemoryIds ?? [],
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }
  const records = getKnowledge()
  saveKnowledge([record, ...records])
  return record
}

export function updateKnowledge(
  id: string,
  updates: UpdateKnowledgeInput,
): KnowledgeRecord | null {
  const records = getKnowledge()
  const idx = records.findIndex(k => k.id === id)
  if (idx === -1) return null
  const updated: KnowledgeRecord = {
    ...records[idx],
    ...updates,
    updatedAt: nowISO(),
  }
  const next = [...records]
  next[idx] = updated
  saveKnowledge(next)
  return updated
}

export function deleteKnowledge(id: string): void {
  saveKnowledge(getKnowledge().filter(k => k.id !== id))
}

export function incrementKnowledgeUsage(id: string): KnowledgeRecord | null {
  const record = getKnowledgeById(id)
  if (!record) return null
  return updateKnowledge(id, {
    usageCount: record.usageCount + 1,
    lastUsedAt: nowISO(),
  })
}
