import type { MemoryRecord } from './memoryTypes'
import { SEED_IDS } from '@/lib/object-engine/objectSeedData'
import { newMemoryId, nowISO } from './memoryUtils'

const NOW = nowISO()

function seed(input: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): MemoryRecord {
  const id = input.id ?? newMemoryId()
  return { ...input, id, createdAt: NOW, updatedAt: NOW }
}

export function createSeedMemories(): MemoryRecord[] {
  return [
    seed({
      id: 'seed-mem-object-first',
      type: 'decision',
      title: 'FounderOS became object-first',
      content: 'All meaningful entities in FounderOS will be represented as FounderObjects with typed relationships.',
      summary: 'Architecture pivot to object-first design.',
      importance: 'critical',
      area: 'systems',
      source: 'seed',
      relatedObjectIds: [SEED_IDS.decisionObjectFirst, SEED_IDS.founderOS],
      tags: ['architecture', 'sprint-3'],
      occurredAt: NOW,
    }),
    seed({
      id: 'seed-mem-notion-planning',
      type: 'decision',
      title: 'Notion became planning/wiki, not the final product',
      content: 'Notion remains useful for planning and wiki-style notes, but AscendOS/FounderOS is the real execution product.',
      importance: 'high',
      area: 'systems',
      source: 'seed',
      relatedObjectIds: [SEED_IDS.ascendOS, SEED_IDS.founderOS],
      tags: ['product', 'strategy'],
      occurredAt: NOW,
    }),
    seed({
      id: 'seed-mem-ai-os',
      type: 'insight',
      title: 'FounderOS should become an AI operating system',
      content: 'FounderOS is not just a productivity app — it is an AI OS for goals, memory, reasoning, planning and execution.',
      summary: 'North-star product insight.',
      importance: 'critical',
      area: 'systems',
      source: 'seed',
      relatedObjectIds: [SEED_IDS.founderOS, SEED_IDS.goalAiOs],
      tags: ['vision', 'product'],
      occurredAt: NOW,
    }),
    seed({
      id: 'seed-mem-domain-modes',
      type: 'insight',
      title: 'Domains like Gym, School, Work should become specialised AI modes',
      content: 'Category-specialised AI modes (Gym, Work, School) can provide context-aware assistance per life domain.',
      importance: 'high',
      area: 'systems',
      source: 'seed',
      relatedObjectIds: [SEED_IDS.ideaCategoryModes, SEED_IDS.founderOS],
      tags: ['ai', 'product'],
      occurredAt: NOW,
    }),
    seed({
      id: 'seed-mem-sprint-2',
      type: 'project_update',
      title: 'Sprint 2 Command Center completed',
      content: 'Shipped the local-first AI Command Center at /dashboard with mission, priorities, health, capture and assistant.',
      importance: 'high',
      area: 'systems',
      source: 'seed',
      relatedObjectIds: [SEED_IDS.founderOS, SEED_IDS.ascendOS],
      tags: ['sprint-2', 'command-center'],
      occurredAt: NOW,
    }),
    seed({
      id: 'seed-mem-sprint-3',
      type: 'project_update',
      title: 'Sprint 3 Object Engine completed',
      content: 'Shipped FounderObjects, relationships, /objects UI, and Command Center sync.',
      importance: 'high',
      area: 'systems',
      source: 'seed',
      relatedObjectIds: [SEED_IDS.founderOS],
      tags: ['sprint-3', 'object-engine'],
      occurredAt: NOW,
    }),
    seed({
      id: 'seed-mem-build-software',
      type: 'reflection',
      title: 'Need to build usable software, not keep planning forever',
      content: 'Planning in Notion and docs has value, but momentum comes from shipping working software each sprint.',
      importance: 'high',
      area: 'growth',
      source: 'seed',
      relatedObjectIds: [SEED_IDS.founderOS],
      tags: ['reflection', 'execution'],
      occurredAt: NOW,
    }),
  ]
}
