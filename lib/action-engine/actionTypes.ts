import type { FounderEventType } from '@/lib/founder-kernel/kernelTypes'

export type ActionType =
  | 'WorkoutLogged'
  | 'GoalUpdated'
  | 'MissionUpdated'
  | 'MemoryCreated'
  | 'KnowledgeCreated'
  | 'TaskCreated'
  | 'ProjectCreated'
  | 'RecoveryUpdated'
  | 'WorkoutCompleted'
  | 'RoutineGenerated'
  | 'ValidationLogged'
  | 'UserFeedbackAdded'
  | 'create_task'
  | 'create_sprint'
  | 'create_memory_draft'
  | 'create_knowledge_draft'
  | 'update_mission'
  | 'defer_item'
  | 'create_capture'
  | 'schedule_placeholder'

export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'undone'

export type AffectedEngine =
  | 'memory'
  | 'knowledge'
  | 'object'
  | 'cognitive'
  | 'gym'
  | 'domain'
  | 'decision'
  | 'outcome'
  | 'kernel'

export interface ActionTypeDefinition {
  type: ActionType
  label: string
  requiredFields: string[]
  optionalFields?: string[]
  affectedEngines: AffectedEngine[]
  reversible: boolean
  domain: string
}

export interface ActionProposal {
  id: string
  type: ActionType
  title: string
  preview: string
  description: string
  rationale: string
  payload: Record<string, unknown>
  status: ActionStatus
  source: string
  sessionId?: string
  turnId?: string
  createdAt: string
  requiresApproval: true
  reversible: boolean
  affectedEngines: AffectedEngine[]
}

export interface ActionExecutionResult {
  success: boolean
  actionId: string
  type: ActionType
  error?: string
  createdIds?: Record<string, string>
  undoToken?: string
  kernelEvents?: Array<{ type: FounderEventType; payload: Record<string, unknown> }>
}

export interface ActionHistoryEntry {
  id: string
  proposalId: string
  type: ActionType
  status: ActionStatus
  preview: string
  executedAt: string
  undoPayload?: Record<string, unknown>
  createdIds?: Record<string, string>
  source: string
}

export interface ActionExecutionContext {
  recordMemory: (input: Record<string, unknown>) => { id: string; title: string; memory?: unknown } | null
  createKnowledge: (input: Record<string, unknown>) => Promise<{ id: string; knowledge?: unknown } | null> | { id: string } | null
  createObject: (input: Record<string, unknown>) => { id: string; object?: unknown } | null
  addTask: (input: Record<string, unknown>) => Promise<void> | void
  createProject: (input: Record<string, unknown>) => Promise<{ id: string }>
  updateMission: (mission: string) => void
  startValidationSprint: () => Promise<void>
  publish: (event: { type: FounderEventType; source: string; payload: Record<string, unknown> }) => Promise<unknown> | unknown
}

export type ActionHandler = (
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
) => Promise<ActionExecutionResult>

export const ACTION_TYPE_DEFINITIONS: Record<ActionType, ActionTypeDefinition> = {
  WorkoutLogged: {
    type: 'WorkoutLogged',
    label: 'Log workout',
    requiredFields: ['exerciseName', 'weight', 'reps'],
    optionalFields: ['sets', 'exerciseId', 'rpe', 'notes'],
    affectedEngines: ['memory', 'object', 'gym', 'domain', 'kernel'],
    reversible: true,
    domain: 'health',
  },
  WorkoutCompleted: {
    type: 'WorkoutCompleted',
    label: 'Complete workout',
    requiredFields: ['title'],
    optionalFields: ['durationMinutes', 'exercises'],
    affectedEngines: ['memory', 'gym', 'domain', 'kernel'],
    reversible: true,
    domain: 'health',
  },
  RecoveryUpdated: {
    type: 'RecoveryUpdated',
    label: 'Update recovery',
    requiredFields: ['status'],
    optionalFields: ['score', 'rationale'],
    affectedEngines: ['gym', 'domain', 'kernel'],
    reversible: false,
    domain: 'health',
  },
  RoutineGenerated: {
    type: 'RoutineGenerated',
    label: 'Generate routine',
    requiredFields: ['title'],
    optionalFields: ['exerciseCount', 'exercises'],
    affectedEngines: ['gym', 'kernel'],
    reversible: false,
    domain: 'health',
  },
  GoalUpdated: {
    type: 'GoalUpdated',
    label: 'Update goal',
    requiredFields: ['title'],
    optionalFields: ['goalId', 'description'],
    affectedEngines: ['object', 'kernel'],
    reversible: true,
    domain: 'general',
  },
  MissionUpdated: {
    type: 'MissionUpdated',
    label: 'Update mission',
    requiredFields: ['mission'],
    affectedEngines: ['cognitive', 'kernel'],
    reversible: true,
    domain: 'founder',
  },
  MemoryCreated: {
    type: 'MemoryCreated',
    label: 'Create memory',
    requiredFields: ['title', 'content'],
    optionalFields: ['type', 'area', 'tags'],
    affectedEngines: ['memory', 'cognitive', 'kernel'],
    reversible: true,
    domain: 'general',
  },
  KnowledgeCreated: {
    type: 'KnowledgeCreated',
    label: 'Create knowledge',
    requiredFields: ['title', 'principle'],
    optionalFields: ['domain', 'tags'],
    affectedEngines: ['knowledge', 'cognitive', 'kernel'],
    reversible: true,
    domain: 'general',
  },
  TaskCreated: {
    type: 'TaskCreated',
    label: 'Create task',
    requiredFields: ['title'],
    optionalFields: ['description', 'dueDate', 'priority', 'projectId'],
    affectedEngines: ['decision', 'kernel'],
    reversible: true,
    domain: 'founder',
  },
  ProjectCreated: {
    type: 'ProjectCreated',
    label: 'Create project',
    requiredFields: ['title'],
    optionalFields: ['description'],
    affectedEngines: ['kernel'],
    reversible: false,
    domain: 'founder',
  },
  ValidationLogged: {
    type: 'ValidationLogged',
    label: 'Log validation',
    requiredFields: ['title'],
    optionalFields: ['notes'],
    affectedEngines: ['memory', 'kernel'],
    reversible: false,
    domain: 'founder',
  },
  UserFeedbackAdded: {
    type: 'UserFeedbackAdded',
    label: 'Add feedback',
    requiredFields: ['content'],
    optionalFields: ['title'],
    affectedEngines: ['memory', 'kernel'],
    reversible: true,
    domain: 'general',
  },
  create_task: {
    type: 'create_task',
    label: 'Create task',
    requiredFields: ['title'],
    optionalFields: ['description', 'dueDate', 'priority', 'projectId'],
    affectedEngines: ['decision', 'kernel'],
    reversible: true,
    domain: 'founder',
  },
  create_sprint: {
    type: 'create_sprint',
    label: 'Start validation sprint',
    requiredFields: [],
    affectedEngines: ['kernel'],
    reversible: false,
    domain: 'founder',
  },
  create_memory_draft: {
    type: 'create_memory_draft',
    label: 'Save memory',
    requiredFields: ['title', 'content'],
    affectedEngines: ['memory', 'cognitive', 'kernel'],
    reversible: true,
    domain: 'founder',
  },
  create_knowledge_draft: {
    type: 'create_knowledge_draft',
    label: 'Save knowledge',
    requiredFields: ['title', 'principle'],
    affectedEngines: ['knowledge', 'cognitive', 'kernel'],
    reversible: true,
    domain: 'founder',
  },
  update_mission: {
    type: 'update_mission',
    label: 'Update mission',
    requiredFields: ['mission'],
    affectedEngines: ['cognitive', 'kernel'],
    reversible: true,
    domain: 'founder',
  },
  defer_item: {
    type: 'defer_item',
    label: 'Defer item',
    requiredFields: ['itemTitle'],
    optionalFields: ['reason'],
    affectedEngines: ['kernel'],
    reversible: false,
    domain: 'founder',
  },
  create_capture: {
    type: 'create_capture',
    label: 'Create capture',
    requiredFields: ['text'],
    affectedEngines: ['kernel'],
    reversible: false,
    domain: 'founder',
  },
  schedule_placeholder: {
    type: 'schedule_placeholder',
    label: 'Schedule',
    requiredFields: ['title'],
    optionalFields: ['startAt', 'durationMinutes'],
    affectedEngines: ['kernel'],
    reversible: false,
    domain: 'founder',
  },
}
