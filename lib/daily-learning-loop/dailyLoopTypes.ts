/**
 * Daily Learning Loop — types.
 */

import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import type { KnowledgeSuggestion } from '@/lib/knowledge-engine/knowledgeTypes'

export interface TomorrowContextData {
  recommendedMission?: string
  carryOverPriorities: string[]
  warnings: string[]
  suggestedFocus: string
  notes?: string
}

export interface TomorrowContext {
  id: string
  date: string
  sourceReviewDate: string
  context: TomorrowContextData
  createdAt: string
}

export interface DailyLearningLoopOutput {
  id: string
  date: string
  summary: string
  whatWorked: string[]
  whatDidNotWork: string[]
  lessons: string[]
  generatedMemoryInputs: CreateMemoryInput[]
  knowledgeSuggestions: KnowledgeSuggestion[]
  tomorrowContext: TomorrowContextData
  createdAt: string
}

export interface TomorrowContextStore {
  contexts: TomorrowContext[]
}

export interface GenerateDailyLearningLoopInput {
  morningPlan: import('@/lib/morning-execution/morningTypes').MorningExecutionPlan | null
  objects: import('@/lib/object-engine/objectTypes').FounderObject[]
  memories: import('@/lib/memory-engine/memoryTypes').MemoryRecord[]
  knowledge: import('@/lib/knowledge-engine/knowledgeTypes').KnowledgeRecord[]
  executiveState: {
    recommendations: import('@/lib/executive-engine/executiveTypes').ExecutiveRecommendation[]
    warnings: string[]
  }
  eveningReview: import('@/lib/evening-review/eveningTypes').EveningReview
}
