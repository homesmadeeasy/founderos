/**
 * FounderOS Executive Engine — core types (Sprint 5).
 * Answers: what matters next?
 */

import type { CommandCenterState } from '@/lib/command-center/types'
import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { FounderObject, LifeArea } from '@/lib/object-engine/objectTypes'

export type ExecutiveConfidence = 'low' | 'medium' | 'high'
export type ExecutivePriority = 'high' | 'medium' | 'low'
export type BriefingType = 'daily' | 'weekly' | 'project' | 'domain'

export interface HealthSignals {
  sleepHours: number | null
  workoutCompleted: boolean
  proteinGrams: number | null
  waterLitres: number | null
  mood: string
  score: number
  summary: string
}

export interface ExecutiveBlocker {
  id: string
  title: string
  reason: string
  relatedObjectIds: string[]
  severity: ExecutivePriority
}

export interface ExecutiveContext {
  date: string
  objects: FounderObject[]
  memories: MemoryRecord[]
  knowledge: KnowledgeRecord[]
  relevantKnowledge: KnowledgeRecord[]
  activeGoals: FounderObject[]
  activeProjects: FounderObject[]
  openTasks: FounderObject[]
  recentMemories: MemoryRecord[]
  recentDecisions: MemoryRecord[]
  healthSignals: HealthSignals | null
  blockers: ExecutiveBlocker[]
  userMission: string
  captures: CommandCenterState['captureItems']
  commandCenter: CommandCenterState
}

export interface ExecutiveRecommendation {
  id: string
  title: string
  summary: string
  rationale: string
  confidence: ExecutiveConfidence
  priority: ExecutivePriority
  area?: LifeArea
  relatedObjectIds: string[]
  relatedMemoryIds: string[]
  createdAt: string
}

export interface ExecutiveBriefing {
  id: string
  type: BriefingType
  title: string
  summary: string
  priorities: string[]
  warnings: string[]
  opportunities: string[]
  recommendations: ExecutiveRecommendation[]
  generatedAt: string
}

export interface AttentionScore {
  objectId: string
  urgency: number
  importance: number
  strategicValue: number
  risk: number
  momentum: number
  energyFit: number
  totalScore: number
  explanation: string
}

export interface ExecutiveDecision {
  id: string
  question: string
  answer: string
  rationale: string
  tradeoffs: string[]
  relatedObjectIds: string[]
  relatedMemoryIds: string[]
  createdAt: string
}

export interface ExecutiveConflictResult {
  warnings: string[]
  tradeoffs: string[]
}

export interface ExecutiveState {
  briefings: ExecutiveBriefing[]
  recommendations: ExecutiveRecommendation[]
  decisions: ExecutiveDecision[]
}

export interface CreateExecutiveContextInput {
  objects: FounderObject[]
  memories: MemoryRecord[]
  knowledge: KnowledgeRecord[]
  commandCenterState: CommandCenterState
}
