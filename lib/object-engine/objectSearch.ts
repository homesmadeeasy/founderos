import type { FounderObject, FounderObjectType, LifeArea } from './objectTypes'
import { normalizeText } from './objectUtils'

export function searchObjects(
  objects: FounderObject[],
  query: string,
  filters?: { type?: FounderObjectType | null; area?: LifeArea | null },
): FounderObject[] {
  const q = normalizeText(query)
  return objects.filter(o => {
    if (filters?.type && o.type !== filters.type) return false
    if (filters?.area && o.area !== filters.area) return false
    if (!q) return true
    const haystack = [
      o.title,
      o.summary,
      o.content,
      o.aiSummary,
      ...o.tags,
      o.type,
      o.area,
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

export function sortObjectsByUpdated(objects: FounderObject[]): FounderObject[] {
  return [...objects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}
