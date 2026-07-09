import type { CaptureClassification } from './captureTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { KnowledgeSuggestion } from '@/lib/knowledge-engine/knowledgeTypes'
import { suggestKnowledgeFromMemory } from '@/lib/knowledge-engine/memoryKnowledgeBridge'

const KNOWLEDGE_ELIGIBLE: CaptureClassification[] = [
  'decision',
  'reflection',
  'memory',
  'question',
]

export function shouldSuggestKnowledge(classification: CaptureClassification): boolean {
  return KNOWLEDGE_ELIGIBLE.includes(classification)
}

export function suggestKnowledgeFromCapture(
  memory: MemoryRecord | null,
  classification: CaptureClassification,
  allMemories: MemoryRecord[] = [],
): KnowledgeSuggestion | null {
  if (!memory || !shouldSuggestKnowledge(classification)) return null
  return suggestKnowledgeFromMemory(memory, allMemories)
}

export function isRepeatedMemoryPattern(
  content: string,
  classification: CaptureClassification,
  memories: MemoryRecord[],
): boolean {
  if (classification !== 'memory' && classification !== 'reflection') return false
  const lower = content.toLowerCase().slice(0, 40)
  const similar = memories.filter(m =>
    m.content.toLowerCase().includes(lower.slice(0, 20))
    && (m.type === 'reflection' || m.type === 'capture'),
  )
  return similar.length >= 2
}
