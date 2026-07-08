/**
 * FounderOS Memory Engine — core types (Sprint 4).
 */

import type { LifeArea } from '@/lib/object-engine/objectTypes'
export { LIFE_AREAS } from '@/lib/object-engine/objectTypes'
export type { LifeArea }

export type MemoryType =
  | 'event'
  | 'decision'
  | 'reflection'
  | 'capture'
  | 'object_change'
  | 'project_update'
  | 'task_update'
  | 'health_log'
  | 'learning'
  | 'conversation'
  | 'review'
  | 'insight'

export type MemoryImportance = 'low' | 'medium' | 'high' | 'critical'

export type MemorySource =
  | 'manual'
  | 'command_center'
  | 'object_engine'
  | 'quick_capture'
  | 'daily_log'
  | 'assistant'
  | 'system'
  | 'seed'

export interface MemoryRecord {
  id: string
  type: MemoryType
  title: string
  content: string
  summary?: string
  importance: MemoryImportance
  area?: LifeArea
  source: MemorySource
  relatedObjectIds: string[]
  tags: string[]
  occurredAt: string
  createdAt: string
  updatedAt: string
}

export type CreateMemoryInput = Omit<MemoryRecord, 'id' | 'occurredAt' | 'createdAt' | 'updatedAt'> & {
  id?: string
  occurredAt?: string
}

export type UpdateMemoryInput = Partial<Omit<MemoryRecord, 'id' | 'createdAt'>>

export const MEMORY_TYPES: MemoryType[] = [
  'event', 'decision', 'reflection', 'capture', 'object_change',
  'project_update', 'task_update', 'health_log', 'learning',
  'conversation', 'review', 'insight',
]

export const MEMORY_IMPORTANCES: MemoryImportance[] = ['low', 'medium', 'high', 'critical']

export const MEMORY_SOURCES: MemorySource[] = [
  'manual', 'command_center', 'object_engine', 'quick_capture',
  'daily_log', 'assistant', 'system', 'seed',
]

export const MEMORY_TYPE_LABEL: Record<MemoryType, string> = {
  event: 'Event',
  decision: 'Decision',
  reflection: 'Reflection',
  capture: 'Capture',
  object_change: 'Object change',
  project_update: 'Project update',
  task_update: 'Task update',
  health_log: 'Health log',
  learning: 'Learning',
  conversation: 'Conversation',
  review: 'Review',
  insight: 'Insight',
}

export const MEMORY_IMPORTANCE_LABEL: Record<MemoryImportance, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}
