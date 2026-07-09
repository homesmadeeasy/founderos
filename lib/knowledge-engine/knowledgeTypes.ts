/**
 * FounderOS Knowledge Engine — core types (Sprint 6).
 * Answers: what principle should guide future action?
 */

export type KnowledgeType =
  | 'principle'
  | 'framework'
  | 'rule'
  | 'lesson'
  | 'standard'
  | 'playbook'
  | 'checklist'
  | 'model'
  | 'sop'
  | 'insight'

export type KnowledgeDomain =
  | 'gym'
  | 'school'
  | 'founder'
  | 'finance'
  | 'health'
  | 'work'
  | 'life'
  | 'systems'

export type KnowledgeConfidence = 'low' | 'medium' | 'high'

export type KnowledgeSource =
  | 'manual'
  | 'memory'
  | 'review'
  | 'assistant'
  | 'seed'
  | 'imported'
  | 'ai_generated'

export interface KnowledgeRecord {
  id: string
  type: KnowledgeType
  title: string
  principle: string
  explanation?: string
  domain?: KnowledgeDomain
  confidence: KnowledgeConfidence
  source: KnowledgeSource
  relatedObjectIds: string[]
  relatedMemoryIds: string[]
  tags: string[]
  usageCount: number
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
}

export type CreateKnowledgeInput = Omit<
  KnowledgeRecord,
  'id' | 'usageCount' | 'lastUsedAt' | 'createdAt' | 'updatedAt'
> & {
  id?: string
  usageCount?: number
  lastUsedAt?: string
}

export type UpdateKnowledgeInput = Partial<Omit<KnowledgeRecord, 'id' | 'createdAt'>>

export interface KnowledgeSuggestion {
  memoryId: string
  suggestedType: KnowledgeType
  suggestedTitle: string
  suggestedPrinciple: string
  suggestedDomain?: KnowledgeDomain
  suggestedExplanation?: string
  confidence: KnowledgeConfidence
  reason: string
}

export const KNOWLEDGE_TYPES: KnowledgeType[] = [
  'principle', 'framework', 'rule', 'lesson', 'standard',
  'playbook', 'checklist', 'model', 'sop', 'insight',
]

export const KNOWLEDGE_DOMAINS: KnowledgeDomain[] = [
  'gym', 'school', 'founder', 'finance', 'health', 'work', 'life', 'systems',
]

export const KNOWLEDGE_CONFIDENCES: KnowledgeConfidence[] = ['low', 'medium', 'high']

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  'manual', 'memory', 'review', 'assistant', 'seed', 'imported', 'ai_generated',
]

export const KNOWLEDGE_TYPE_LABEL: Record<KnowledgeType, string> = {
  principle: 'Principle',
  framework: 'Framework',
  rule: 'Rule',
  lesson: 'Lesson',
  standard: 'Standard',
  playbook: 'Playbook',
  checklist: 'Checklist',
  model: 'Model',
  sop: 'SOP',
  insight: 'Insight',
}

export const KNOWLEDGE_DOMAIN_LABEL: Record<KnowledgeDomain, string> = {
  gym: 'Gym',
  school: 'School',
  founder: 'Founder',
  finance: 'Finance',
  health: 'Health',
  work: 'Work',
  life: 'Life',
  systems: 'Systems',
}

export const KNOWLEDGE_CONFIDENCE_LABEL: Record<KnowledgeConfidence, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}
