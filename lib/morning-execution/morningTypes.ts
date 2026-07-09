/**
 * Morning Execution — types.
 */

import type { RecommendedPlanItem } from '@/lib/reasoning-engine/reasoningTypes'

export type ScheduleBlockType = 'Deep Work' | 'Health' | 'Learning' | 'Admin' | 'Recovery'

export interface ScheduleBlock {
  id: string
  type: ScheduleBlockType
  label: string
  durationMinutes: number
  planItemId?: string
}

export interface MorningExecutionPlan {
  id: string
  date: string
  contextId: string
  reasoningId: string
  title: string
  summary: string
  primaryMission: string
  topPriorities: RecommendedPlanItem[]
  scheduleBlocks: ScheduleBlock[]
  warnings: string[]
  deferList: string[]
  completed: boolean
  memoryWritten: boolean
  generatedAt: string
  updatedAt: string
}

export interface MorningStore {
  plans: MorningExecutionPlan[]
}
