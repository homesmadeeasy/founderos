/**
 * Helpers that map existing engine views into IntelligenceSources.
 * No new engines — read adapters only.
 */

import { searchMemories } from '@/lib/memory-engine/memorySearch'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { WorldModel } from '@/lib/cognitive-model/beliefTypes'
import type { IdentitySpecialistView } from '@/lib/identity/identityTypes'
import type { RealitySnapshot } from '@/lib/reality/RealityTypes'
import type { IntelligenceSources } from './intelligenceTypes'

export function sourcesFromEngines(input: {
  question: string
  identity?: IdentitySpecialistView | null
  reality?: RealitySnapshot | null
  memories?: MemoryRecord[]
  knowledge?: Array<{ id: string; title: string; summary?: string; content?: string }>
  worldModel?: WorldModel | null
  goals?: string[]
  decisionSummary?: string | null
  reasoningSummary?: string | null
  executiveRecommendations?: string[]
}): IntelligenceSources {
  const identityHints = input.identity?.narrativeHints ?? []
  const realityHints = input.reality?.narrativeHints ?? []
  const memories = searchMemories(input.memories ?? [], input.question)
    .slice(0, 8)
    .map(m => ({
      id: m.id,
      title: m.title,
      summary: m.summary || m.content.slice(0, 160),
    }))

  // If keyword search is empty, fall back to recent memories.
  const memoryHits = memories.length
    ? memories
    : (input.memories ?? [])
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        title: m.title,
        summary: m.summary || m.content.slice(0, 160),
      }))

  const beliefs = (input.worldModel?.beliefs ?? [])
    .filter(b => b.status !== 'contradicted')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)
    .map(b => ({
      id: b.id,
      statement: b.statement,
      confidence: b.confidence > 1 ? b.confidence / 100 : b.confidence,
      topic: b.topic,
    }))

  const knowledge = (input.knowledge ?? []).slice(0, 6).map(k => ({
    id: k.id,
    title: k.title,
    summary: k.summary || k.content?.slice(0, 160) || '',
  }))

  return {
    identityHints,
    identitySummary: identityHints.join('; ') || undefined,
    realityHints,
    realitySummary: realityHints.join('; ') || input.reality?.momentum?.note,
    memories: memoryHits,
    knowledge,
    beliefs,
    goals: input.goals,
    decisionSummary: input.decisionSummary ?? undefined,
    reasoningSummary: input.reasoningSummary ?? undefined,
    executiveRecommendations: input.executiveRecommendations,
  }
}
