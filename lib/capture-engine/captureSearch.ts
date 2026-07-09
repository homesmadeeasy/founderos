import { searchMemories } from '@/lib/memory-engine/memorySearch'
import { reloadMemoryStore } from '@/lib/memory-engine/memoryStorage'
import { searchKnowledgeRecords } from '@/lib/knowledge-engine/knowledgeSearch'
import { reloadKnowledgeStore } from '@/lib/knowledge-engine/knowledgeStorage'
import { searchObjects } from '@/lib/object-engine/objectSearch'
import { reloadStore as reloadObjectStore } from '@/lib/object-engine/objectStorage'
import { searchSignals } from './captureStorage'
import type { CaptureSignal } from './captureTypes'
import { CAPTURE_CLASSIFICATION_LABEL } from './captureTypes'

export interface UnifiedSearchResult {
  id: string
  kind: 'capture' | 'object' | 'memory' | 'knowledge'
  title: string
  preview: string
  href: string
  badge: string
}

export function searchUnified(query: string, limit = 20): UnifiedSearchResult[] {
  const q = query.trim()
  if (!q) return []

  const results: UnifiedSearchResult[] = []

  for (const signal of searchSignals(q, 8)) {
    results.push(captureToResult(signal))
  }

  const objects = reloadObjectStore().objects
  for (const obj of searchObjects(objects, q).slice(0, 6)) {
    results.push({
      id: obj.id,
      kind: 'object',
      title: obj.title,
      preview: obj.summary || obj.content?.slice(0, 80) || obj.type,
      href: '/objects',
      badge: 'Object',
    })
  }

  const memories = reloadMemoryStore().memories
  for (const mem of searchMemories(memories, q).slice(0, 6)) {
    results.push({
      id: mem.id,
      kind: 'memory',
      title: mem.title,
      preview: mem.summary || mem.content.slice(0, 80),
      href: '/memory',
      badge: 'Memory',
    })
  }

  const knowledge = reloadKnowledgeStore().knowledge
  for (const k of searchKnowledgeRecords(knowledge, q).slice(0, 6)) {
    results.push({
      id: k.id,
      kind: 'knowledge',
      title: k.title,
      preview: k.principle.slice(0, 80),
      href: '/knowledge',
      badge: 'Knowledge',
    })
  }

  return results.slice(0, limit)
}

function captureToResult(signal: CaptureSignal): UnifiedSearchResult {
  return {
    id: signal.id,
    kind: 'capture',
    title: signal.parsedTitle,
    preview: signal.rawInput.slice(0, 100),
    href: '/inbox',
    badge: CAPTURE_CLASSIFICATION_LABEL[signal.classification],
  }
}

export function getCaptureStatsForDate(date: string): {
  total: number
  ideas: number
  questions: number
  decisions: number
  unprocessed: number
} {
  const signals = searchSignals('', 500).filter(s => s.timestamp.slice(0, 10) === date)
  return {
    total: signals.length,
    ideas: signals.filter(s => s.classification === 'idea').length,
    questions: signals.filter(s => s.classification === 'question').length,
    decisions: signals.filter(s => s.classification === 'decision').length,
    unprocessed: signals.filter(s => s.status === 'new' || s.status === 'needs_review').length,
  }
}
