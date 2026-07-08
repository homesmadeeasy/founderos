import type { MemoryRecord } from './memoryTypes'
import { normalizeQuery } from './memoryUtils'

export function searchMemories(
  memories: MemoryRecord[],
  query: string,
  filters?: {
    type?: MemoryRecord['type'] | null
    area?: MemoryRecord['area'] | null
    importance?: MemoryRecord['importance'] | null
  },
): MemoryRecord[] {
  const q = normalizeQuery(query)
  return memories.filter(m => {
    if (filters?.type && m.type !== filters.type) return false
    if (filters?.area && m.area !== filters.area) return false
    if (filters?.importance && m.importance !== filters.importance) return false
    if (!q) return true
    const haystack = [
      m.title, m.content, m.summary,
      ...m.tags, m.type, m.area, m.source,
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

export function sortMemoriesByOccurred(memories: MemoryRecord[]): MemoryRecord[] {
  return [...memories].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )
}
