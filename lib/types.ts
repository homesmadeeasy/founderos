export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical'
export type RiskStatus = 'open' | 'mitigated' | 'closed'
export type RoadmapStatus = 'planned' | 'in_progress' | 'done'
export type MessageRole = 'user' | 'assistant'

export interface Project {
  id: string
  title: string
  description: string
  goal: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  createdAt: string
}

export interface Note {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: string
}

export interface Decision {
  id: string
  projectId: string
  decision: string
  reasoning: string
  createdAt: string
}

export interface Risk {
  id: string
  projectId: string
  title: string
  description: string
  severity: RiskSeverity
  mitigation: string
  status: RiskStatus
  createdAt: string
}

export interface RoadmapItem {
  id: string
  projectId: string
  title: string
  description: string
  stage: string
  status: RoadmapStatus
  sortOrder: number
  createdAt: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: string
}
