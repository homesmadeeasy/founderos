import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import type { KnowledgeSuggestion } from '@/lib/knowledge-engine/knowledgeTypes'
import type { FounderObject, FounderObjectType } from '@/lib/object-engine/objectTypes'

export type CaptureSource =
  | 'manual'
  | 'voice'
  | 'command_palette'
  | 'quick_capture'
  | 'mobile'
  | 'browser_extension'
  | 'future_api'

export type CaptureStatus = 'new' | 'processed' | 'needs_review' | 'archived'

export type CaptureClassification =
  | 'task'
  | 'idea'
  | 'book'
  | 'goal'
  | 'question'
  | 'memory'
  | 'reflection'
  | 'decision'
  | 'person'
  | 'meeting'
  | 'meal'
  | 'workout'
  | 'note'
  | 'unknown'

export type CaptureConfidence = 'low' | 'medium' | 'high'

export interface ParsedCapture {
  rawInput: string
  title: string
  content: string
  explicitPrefix?: CaptureClassification
}

export interface ClassificationResult {
  classification: CaptureClassification
  confidence: CaptureConfidence
  possibleActions: string[]
  reason: string
}

export interface CaptureSignal {
  id: string
  rawInput: string
  source: CaptureSource
  timestamp: string
  processed: boolean
  classification: CaptureClassification
  confidence: CaptureConfidence
  possibleActions: string[]
  createdObjectId?: string
  createdMemoryId?: string
  createdKnowledgeId?: string
  knowledgeSuggestionPending: boolean
  status: CaptureStatus
  parsedTitle: string
  parsedContent: string
}

export interface CaptureResult {
  signal: CaptureSignal
  classification: CaptureClassification
  confidence: CaptureConfidence
  objectCreated: boolean
  objectId?: string
  objectType?: FounderObjectType
  memoryCreated: boolean
  memoryId?: string
  knowledgeSuggestion?: KnowledgeSuggestion | null
  message: string
}

export interface CaptureStore {
  signals: CaptureSignal[]
}

export interface CapturePipelineInput {
  rawInput: string
  source?: CaptureSource
}

export interface CapturePipelineDeps {
  createObjectSync: (input: import('@/lib/object-engine/objectTypes').CreateObjectInput) => FounderObject
  recordMemory: (input: CreateMemoryInput) => import('@/lib/memory-engine/memoryTypes').MemoryRecord | null
  memories: import('@/lib/memory-engine/memoryTypes').MemoryRecord[]
  syncCommandCenterCapture?: (item: import('@/lib/command-center/types').CCCaptureItem) => void
}

export const CAPTURE_CLASSIFICATION_LABEL: Record<CaptureClassification, string> = {
  task: 'Task',
  idea: 'Idea',
  book: 'Book',
  goal: 'Goal',
  question: 'Question',
  memory: 'Memory',
  reflection: 'Reflection',
  decision: 'Decision',
  person: 'Person',
  meeting: 'Meeting',
  meal: 'Meal',
  workout: 'Workout',
  note: 'Note',
  unknown: 'Capture',
}

export const CAPTURE_SOURCE_LABEL: Record<CaptureSource, string> = {
  manual: 'Manual',
  voice: 'Voice',
  command_palette: 'Command palette',
  quick_capture: 'Quick capture',
  mobile: 'Mobile',
  browser_extension: 'Browser',
  future_api: 'API',
}
