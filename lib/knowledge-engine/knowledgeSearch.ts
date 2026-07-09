import type { KnowledgeDomain, KnowledgeRecord, KnowledgeType } from './knowledgeTypes'
import { normalizeQuery } from './knowledgeUtils'

export function searchKnowledgeRecords(
  records: KnowledgeRecord[],
  query: string,
  filters?: {
    type?: KnowledgeType | null
    domain?: KnowledgeDomain | null
    confidence?: string | null
  },
): KnowledgeRecord[] {
  const q = normalizeQuery(query)
  let results = [...records]

  if (filters?.type) {
    results = results.filter(r => r.type === filters.type)
  }
  if (filters?.domain) {
    results = results.filter(r => r.domain === filters.domain)
  }
  if (filters?.confidence) {
    results = results.filter(r => r.confidence === filters.confidence)
  }

  if (!q) return sortKnowledgeByUpdated(results)

  return sortKnowledgeByUpdated(
    results.filter(r =>
      r.title.toLowerCase().includes(q)
      || r.principle.toLowerCase().includes(q)
      || (r.explanation?.toLowerCase().includes(q) ?? false)
      || r.tags.some(t => t.toLowerCase().includes(q)),
    ),
  )
}

export function sortKnowledgeByUpdated(records: KnowledgeRecord[]): KnowledgeRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function sortKnowledgeByUsage(records: KnowledgeRecord[]): KnowledgeRecord[] {
  return [...records].sort((a, b) => b.usageCount - a.usageCount)
}
