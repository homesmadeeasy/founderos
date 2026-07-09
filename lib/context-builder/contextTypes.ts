/**
 * FounderOS Context Builder — types (Morning Execution Slice).
 */

import type { CommandCenterState } from '@/lib/command-center/types'
import type { ExecutiveRecommendation } from '@/lib/executive-engine/executiveTypes'
import type { HealthSignals } from '@/lib/executive-engine/executiveTypes'
import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type { CCCaptureItem } from '@/lib/command-center/types'

export interface ContextBlocker {
  id: string
  title: string
  reason: string
  severity: 'high' | 'medium' | 'low'
  relatedObjectIds: string[]
}

export interface ContextOpportunity {
  id: string
  title: string
  reason: string
  relatedObjectIds: string[]
  relatedKnowledgeIds: string[]
}

export interface ExecutiveStateSnapshot {
  recommendations: ExecutiveRecommendation[]
  warnings: string[]
  tradeoffs: string[]
}

export interface DailyContext {
  id: string
  date: string
  mission: string
  activeProjects: FounderObject[]
  activeGoals: FounderObject[]
  openTasks: FounderObject[]
  recentMemories: MemoryRecord[]
  relevantKnowledge: KnowledgeRecord[]
  executiveRecommendations: ExecutiveRecommendation[]
  healthSignals: HealthSignals | null
  blockers: ContextBlocker[]
  opportunities: ContextOpportunity[]
  unresolvedCaptures: CCCaptureItem[]
  contextScore: number
  generatedAt: string
}

export interface BuildDailyContextInput {
  objects: FounderObject[]
  memories: MemoryRecord[]
  knowledge: KnowledgeRecord[]
  executiveState: ExecutiveStateSnapshot
  commandCenterState: CommandCenterState
  healthSignals?: HealthSignals | null
}

export interface DailyContextStore {
  contexts: DailyContext[]
}
