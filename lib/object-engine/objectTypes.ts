/**
 * FounderOS Object Engine — core type definitions (Sprint 3).
 */

export type FounderObjectType =
  | 'project'
  | 'task'
  | 'goal'
  | 'habit'
  | 'idea'
  | 'note'
  | 'decision'
  | 'workout'
  | 'meal'
  | 'book'
  | 'document'
  | 'person'
  | 'event'
  | 'review'
  | 'conversation'
  | 'capture'

export type LifeArea = 'health' | 'knowledge' | 'growth' | 'career' | 'systems'

export type ObjectStatus = 'active' | 'inactive' | 'completed' | 'archived' | 'inbox'

export type ObjectPriority = 'high' | 'medium' | 'low'

export type ObjectSource =
  | 'manual'
  | 'command_center'
  | 'quick_capture'
  | 'seed'
  | 'imported'
  | 'ai_generated'

export type RelationshipType =
  | 'belongs_to'
  | 'supports'
  | 'blocks'
  | 'depends_on'
  | 'related_to'
  | 'created_from'
  | 'part_of'
  | 'follows'
  | 'references'
  | 'improves'
  | 'conflicts_with'

export interface ObjectRelationship {
  id: string
  fromObjectId: string
  toObjectId: string
  type: RelationshipType
  strength?: number
  createdAt: string
}

export interface FounderObject {
  id: string
  type: FounderObjectType
  title: string
  summary?: string
  content?: string
  area?: LifeArea
  status?: ObjectStatus
  priority?: ObjectPriority
  tags: string[]
  source?: ObjectSource
  metadata: Record<string, unknown>
  relationships: ObjectRelationship[]
  aiSummary?: string
  createdAt: string
  updatedAt: string
}

export type CreateObjectInput = Omit<FounderObject, 'id' | 'relationships' | 'createdAt' | 'updatedAt'> & {
  id?: string
  relationships?: ObjectRelationship[]
}

export type UpdateObjectInput = Partial<Omit<FounderObject, 'id' | 'createdAt'>>

export const FOUNDER_OBJECT_TYPES: FounderObjectType[] = [
  'project', 'task', 'goal', 'habit', 'idea', 'note', 'decision',
  'workout', 'meal', 'book', 'document', 'person', 'event',
  'review', 'conversation', 'capture',
]

export const LIFE_AREAS: LifeArea[] = ['health', 'knowledge', 'growth', 'career', 'systems']

export const OBJECT_STATUSES: ObjectStatus[] = ['active', 'inactive', 'completed', 'archived', 'inbox']

export const OBJECT_PRIORITIES: ObjectPriority[] = ['high', 'medium', 'low']

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'belongs_to', 'supports', 'blocks', 'depends_on', 'related_to',
  'created_from', 'part_of', 'follows', 'references', 'improves', 'conflicts_with',
]

export const OBJECT_TYPE_LABEL: Record<FounderObjectType, string> = {
  project: 'Project',
  task: 'Task',
  goal: 'Goal',
  habit: 'Habit',
  idea: 'Idea',
  note: 'Note',
  decision: 'Decision',
  workout: 'Workout',
  meal: 'Meal',
  book: 'Book',
  document: 'Document',
  person: 'Person',
  event: 'Event',
  review: 'Review',
  conversation: 'Conversation',
  capture: 'Capture',
}

export const LIFE_AREA_LABEL: Record<LifeArea, string> = {
  health: 'Health',
  knowledge: 'Knowledge',
  growth: 'Growth',
  career: 'Career',
  systems: 'Systems',
}

export const RELATIONSHIP_TYPE_LABEL: Record<RelationshipType, string> = {
  belongs_to: 'Belongs to',
  supports: 'Supports',
  blocks: 'Blocks',
  depends_on: 'Depends on',
  related_to: 'Related to',
  created_from: 'Created from',
  part_of: 'Part of',
  follows: 'Follows',
  references: 'References',
  improves: 'Improves',
  conflicts_with: 'Conflicts with',
}
