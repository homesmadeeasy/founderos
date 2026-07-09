/**
 * FounderOS Reasoning Engine — types (Morning Execution Slice).
 */

import type { LifeArea } from '@/lib/object-engine/objectTypes'

export type PlanPriority = 'high' | 'medium' | 'low'

export interface RecommendedPlanItem {
  id: string
  title: string
  reason: string
  area?: LifeArea
  priority: PlanPriority
  estimatedMinutes?: number
  relatedObjectIds: string[]
  relatedMemoryIds: string[]
  relatedKnowledgeIds: string[]
  completed?: boolean
}

export interface DailyReasoningOutput {
  id: string
  date: string
  summary: string
  primaryFocus: string
  secondaryFocuses: string[]
  recommendedPlan: RecommendedPlanItem[]
  deferList: string[]
  risks: string[]
  blockers: string[]
  rationale: string
  generatedAt: string
}

export interface ReasoningStore {
  outputs: DailyReasoningOutput[]
}
