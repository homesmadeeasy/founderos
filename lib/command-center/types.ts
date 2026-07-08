/**
 * AI Command Center — local data model (Sprint 2).
 * Structured for future Supabase migration.
 */

export type LifeArea = 'health' | 'knowledge' | 'growth' | 'career' | 'systems'

export type TaskStatus = 'not_started' | 'in_progress' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export type ProjectStatus = 'active' | 'paused' | 'completed'

export type CaptureType = 'idea' | 'task' | 'note' | 'decision' | 'question'
export type CaptureStatus = 'inbox' | 'processed'

export interface CCProject {
  id: string
  name: string
  status: ProjectStatus
  area: LifeArea
  outcome: string
  nextAction: string
  createdAt: string
  updatedAt: string
}

export interface CCTask {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  area: LifeArea
  dueDate: string | null
  projectId: string | null
  createdAt: string
  updatedAt: string
}

export interface CCDailyLog {
  id: string
  date: string
  sleepHours: number | null
  weight: number | null
  proteinGrams: number | null
  waterLitres: number | null
  workoutCompleted: boolean
  mood: string
  reflection: string
  createdAt: string
  updatedAt: string
}

export interface CCAIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface CCCaptureItem {
  id: string
  type: CaptureType
  content: string
  status: CaptureStatus
  createdAt: string
}

export interface CommandCenterState {
  mission: string
  missionDate: string
  projects: CCProject[]
  tasks: CCTask[]
  dailyLogs: CCDailyLog[]
  captureItems: CCCaptureItem[]
  aiMessages: CCAIMessage[]
}

export const LIFE_AREAS: LifeArea[] = ['health', 'knowledge', 'growth', 'career', 'systems']
export const TASK_PRIORITIES: TaskPriority[] = ['high', 'medium', 'low']
export const TASK_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'done']
export const PROJECT_STATUSES: ProjectStatus[] = ['active', 'paused', 'completed']
export const CAPTURE_TYPES: CaptureType[] = ['idea', 'task', 'note', 'decision', 'question']

export const LIFE_AREA_LABEL: Record<LifeArea, string> = {
  health: 'Health',
  knowledge: 'Knowledge',
  growth: 'Growth',
  career: 'Career',
  systems: 'Systems',
}

export const CAPTURE_TYPE_LABEL: Record<CaptureType, string> = {
  idea: 'Idea',
  task: 'Task',
  note: 'Note',
  decision: 'Decision',
  question: 'Question',
}
