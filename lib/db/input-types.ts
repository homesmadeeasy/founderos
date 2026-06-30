/**
 * Insert payload types for Supabase mutations.
 * Kept separate from React context to avoid circular imports with the db layer.
 */

import type {
  ProjectStatus, ProjectPriority, TaskStatus, TaskPriority,
  RiskSeverity, RiskStatus, RoadmapStatus, IdeaStatus,
  EntityType, RelationshipType,
} from '@/lib/types'

export type NewProject = {
  title: string
  description: string
  goal: string
  status: ProjectStatus
  priority: ProjectPriority
  progress: number
}

export type NewTask = {
  projectId: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  sourceMessageId?: string
}

export type NewNote = {
  projectId: string
  title: string
  content: string
  sourceMessageId?: string
}

export type NewDecision = {
  projectId: string
  decision: string
  reasoning: string
  sourceMessageId?: string
}

export type NewRisk = {
  projectId: string
  title: string
  description: string
  severity: RiskSeverity
  mitigation: string
  status: RiskStatus
}

export type NewRoadmapItem = {
  projectId: string
  title: string
  description: string
  stage: string
  status: RoadmapStatus
  sortOrder: number
}

export type NewIdea = {
  title: string
  description: string
  targetUser: string
  problem: string
  solution: string
  potentialScore: number
  difficultyScore: number
  status: IdeaStatus
  tags: string[]
}

export type NewLink = {
  sourceType: EntityType
  sourceId: string
  targetType: EntityType
  targetId: string
  relationshipType: RelationshipType
  description?: string
}

export type NewProjectFile = {
  projectId: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  extractedText?: string
}
