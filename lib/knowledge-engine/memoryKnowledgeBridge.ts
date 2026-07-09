import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type {
  CreateKnowledgeInput,
  KnowledgeDomain,
  KnowledgeSuggestion,
  KnowledgeType,
} from './knowledgeTypes'
import { getKnowledge, getKnowledgeForMemory } from './knowledgeStorage'
import { createKnowledge } from './knowledgeStorage'
import { getMemoryById } from '@/lib/memory-engine/memoryStorage'

function inferDomain(memory: MemoryRecord): KnowledgeDomain | undefined {
  if (memory.area === 'health') return 'health'
  if (memory.area === 'systems') return 'systems'
  if (memory.area === 'knowledge') return 'school'
  if (memory.area === 'career') return 'work'
  if (memory.area === 'growth') return 'life'
  if (memory.tags.some(t => t.includes('gym') || t.includes('workout'))) return 'gym'
  if (memory.tags.some(t => t.includes('founder') || t.includes('founderos'))) return 'founder'
  return undefined
}

function countRecentHealthLogs(memories: MemoryRecord[], withinDays = 14): number {
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000
  return memories.filter(
    m => m.type === 'health_log' && new Date(m.occurredAt).getTime() >= cutoff,
  ).length
}

export function suggestKnowledgeFromMemory(
  memory: MemoryRecord,
  allMemories: MemoryRecord[] = [],
): KnowledgeSuggestion | null {
  if (getKnowledgeForMemory(memory.id).length > 0) return null

  const domain = inferDomain(memory)

  if (memory.type === 'decision') {
    return {
      memoryId: memory.id,
      suggestedType: 'principle',
      suggestedTitle: `Principle from: ${memory.title}`,
      suggestedPrinciple: memory.summary || memory.content,
      suggestedDomain: domain ?? 'founder',
      suggestedExplanation: `Extracted from decision memory on ${memory.occurredAt.slice(0, 10)}.`,
      confidence: memory.importance === 'high' || memory.importance === 'critical' ? 'high' : 'medium',
      reason: 'Decision memories often encode durable principles.',
    }
  }

  if (memory.type === 'reflection') {
    return {
      memoryId: memory.id,
      suggestedType: 'lesson',
      suggestedTitle: `Lesson: ${memory.title}`,
      suggestedPrinciple: memory.content.slice(0, 200),
      suggestedDomain: domain ?? 'life',
      suggestedExplanation: 'Reflection captured a learning worth preserving.',
      confidence: 'medium',
      reason: 'Reflection memories can become lessons.',
    }
  }

  if (memory.type === 'review') {
    return {
      memoryId: memory.id,
      suggestedType: 'playbook',
      suggestedTitle: `Playbook: ${memory.title}`,
      suggestedPrinciple: memory.summary || memory.content.slice(0, 160),
      suggestedDomain: domain,
      suggestedExplanation: 'Review insights can become repeatable playbooks.',
      confidence: 'medium',
      reason: 'Review memories can suggest playbooks or checklists.',
    }
  }

  if (memory.type === 'health_log') {
    const recentHealth = countRecentHealthLogs(allMemories)
    if (recentHealth >= 3) {
      return {
        memoryId: memory.id,
        suggestedType: 'rule',
        suggestedTitle: 'Consistent health logging',
        suggestedPrinciple: 'Log sleep, nutrition, and movement daily to protect long-term output.',
        suggestedDomain: 'health',
        suggestedExplanation: `${recentHealth} health logs in the last two weeks suggest a durable habit.`,
        confidence: 'high',
        reason: 'Repeated health_log memories suggest a health rule.',
      }
    }
  }

  if (memory.type === 'insight') {
    return {
      memoryId: memory.id,
      suggestedType: 'insight',
      suggestedTitle: memory.title,
      suggestedPrinciple: memory.content,
      suggestedDomain: domain ?? 'systems',
      confidence: 'medium',
      reason: 'Insight memories can be promoted to knowledge.',
    }
  }

  return null
}

export function buildKnowledgeInputFromSuggestion(
  suggestion: KnowledgeSuggestion,
  overrides?: Partial<CreateKnowledgeInput>,
): CreateKnowledgeInput {
  const memory = getMemoryById(suggestion.memoryId)
  return {
    type: (overrides?.type ?? suggestion.suggestedType) as KnowledgeType,
    title: overrides?.title ?? suggestion.suggestedTitle,
    principle: overrides?.principle ?? suggestion.suggestedPrinciple,
    explanation: overrides?.explanation ?? suggestion.suggestedExplanation,
    domain: overrides?.domain ?? suggestion.suggestedDomain,
    confidence: overrides?.confidence ?? suggestion.confidence,
    source: 'memory',
    relatedObjectIds: memory?.relatedObjectIds ?? [],
    relatedMemoryIds: [suggestion.memoryId],
    tags: overrides?.tags ?? ['from-memory'],
    ...overrides,
  }
}

export function createKnowledgeFromMemory(
  memoryId: string,
  knowledgeInput?: Partial<CreateKnowledgeInput>,
): import('./knowledgeTypes').KnowledgeRecord | null {
  const memory = getMemoryById(memoryId)
  if (!memory) return null

  const suggestion = suggestKnowledgeFromMemory(memory)
  const input = suggestion
    ? buildKnowledgeInputFromSuggestion(suggestion, knowledgeInput)
    : {
        type: 'lesson' as const,
        title: `Lesson: ${memory.title}`,
        principle: memory.summary || memory.content,
        source: 'memory' as const,
        confidence: 'medium' as const,
        relatedObjectIds: memory.relatedObjectIds,
        relatedMemoryIds: [memoryId],
        tags: ['from-memory'],
        ...knowledgeInput,
      }

  if (getKnowledge().some(k => k.relatedMemoryIds.includes(memoryId))) return null
  return createKnowledge(input)
}

export function suggestKnowledgeFromMemories(
  memories: MemoryRecord[],
  limit = 5,
): KnowledgeSuggestion[] {
  const existingMemoryIds = new Set(
    getKnowledge().flatMap(k => k.relatedMemoryIds),
  )
  const suggestions: KnowledgeSuggestion[] = []

  for (const memory of memories) {
    if (existingMemoryIds.has(memory.id)) continue
    const suggestion = suggestKnowledgeFromMemory(memory, memories)
    if (suggestion) {
      suggestions.push(suggestion)
      if (suggestions.length >= limit) break
    }
  }

  return suggestions
}
