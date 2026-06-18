// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | 'idea'
  | 'planning'
  | 'building'
  | 'testing'
  | 'launched'
  | 'paused'
  | 'archived'

export type ProjectPriority = 'low' | 'medium' | 'high'

export interface Project {
  id: string
  title: string
  description: string
  goal: string
  status: ProjectStatus
  priority: ProjectPriority
  /** Manual progress override: 0–100. Falls back to task completion if 0. */
  progress: number
  createdAt: string
  updatedAt: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskStatus   = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low'  | 'medium'      | 'high'

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

// ─── Note ─────────────────────────────────────────────────────────────────────

export interface Note {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: string
}

// ─── Decision ─────────────────────────────────────────────────────────────────

export interface Decision {
  id: string
  projectId: string
  decision: string
  reasoning: string
  createdAt: string
}

// ─── Risk ─────────────────────────────────────────────────────────────────────

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical'
export type RiskStatus   = 'open' | 'mitigated' | 'closed'

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

// ─── Roadmap ──────────────────────────────────────────────────────────────────

export type RoadmapStatus = 'planned' | 'in_progress' | 'done'

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

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: string
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppState {
  projects: Project[]
  tasks: Task[]
  notes: Note[]
  decisions: Decision[]
  risks: Risk[]
  roadmapItems: RoadmapItem[]
  chatMessages: Record<string, Message[]>
}
