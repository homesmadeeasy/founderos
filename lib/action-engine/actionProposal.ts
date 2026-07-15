import type { ActionType, ActionProposal } from './actionTypes'

const STORAGE_KEY = 'founderos-action-proposals-v1'

function readAll(): ActionProposal[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ActionProposal[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: ActionProposal[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 200)))
}

export function listActionProposals(): ActionProposal[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getActionProposal(id: string): ActionProposal | undefined {
  return readAll().find((p) => p.id === id)
}

export function upsertActionProposal(proposal: ActionProposal): void {
  const items = readAll()
  const idx = items.findIndex((p) => p.id === proposal.id)
  if (idx >= 0) items[idx] = proposal
  else items.unshift(proposal)
  writeAll(items)
}

export function updateActionProposalStatus(
  id: string,
  status: ActionProposal['status'],
): ActionProposal | undefined {
  const items = readAll()
  const idx = items.findIndex((p) => p.id === id)
  if (idx < 0) return undefined
  items[idx] = { ...items[idx], status }
  writeAll(items)
  return items[idx]
}

export function listPendingActionProposals(): ActionProposal[] {
  return listActionProposals().filter((p) => p.status === 'pending')
}

export function buildActionPreview(type: ActionType, payload: Record<string, unknown>): string {
  switch (type) {
    case 'WorkoutLogged': {
      const sets = payload.sets ?? 3
      return [
        'WorkoutLogged',
        `Exercise: ${payload.exerciseName ?? 'Exercise'}`,
        `Weight: ${payload.weight ?? 0}kg`,
        `Reps: ${payload.reps ?? 0}`,
        `Sets: ${sets}`,
      ].join('\n')
    }
    case 'WorkoutCompleted':
      return `WorkoutCompleted\nSession: ${payload.title ?? 'Workout'}`
    case 'RecoveryUpdated':
      return `RecoveryUpdated\nStatus: ${payload.status ?? 'unknown'}`
    case 'RoutineGenerated':
      return `RoutineGenerated\n${payload.title ?? 'Routine'}`
    case 'GoalUpdated':
      return `GoalUpdated\n${payload.title ?? 'Goal'}`
    case 'MissionUpdated':
    case 'update_mission':
      return `MissionUpdated\n${String(payload.mission ?? '').slice(0, 120)}`
    case 'MemoryCreated':
    case 'create_memory_draft':
      return `MemoryCreated\n${payload.title ?? 'Memory'}\n${String(payload.content ?? '').slice(0, 80)}`
    case 'KnowledgeCreated':
    case 'create_knowledge_draft':
      return `KnowledgeCreated\n${payload.title ?? 'Knowledge'}\n${String(payload.principle ?? '').slice(0, 80)}`
    case 'TaskCreated':
    case 'create_task':
      return `TaskCreated\n${payload.title ?? 'Task'}`
    case 'ProjectCreated':
      return `ProjectCreated\n${payload.title ?? 'Project'}`
    case 'ValidationLogged':
    case 'create_sprint':
      return `ValidationLogged\n${payload.title ?? 'Validation sprint'}`
    case 'UserFeedbackAdded':
      return `UserFeedbackAdded\n${String(payload.content ?? '').slice(0, 100)}`
    default:
      return `${type}\n${JSON.stringify(payload).slice(0, 120)}`
  }
}

export function buildActionTitle(type: ActionType, payload: Record<string, unknown>): string {
  switch (type) {
    case 'WorkoutLogged':
      return `Log ${payload.exerciseName ?? 'workout'}`
    case 'TaskCreated':
    case 'create_task':
      return `Create task: ${payload.title ?? 'Task'}`
    case 'MemoryCreated':
    case 'create_memory_draft':
      return `Save memory: ${payload.title ?? 'Memory'}`
    case 'KnowledgeCreated':
    case 'create_knowledge_draft':
      return `Save knowledge: ${payload.title ?? 'Knowledge'}`
    case 'MissionUpdated':
    case 'update_mission':
      return 'Update mission'
    case 'ValidationLogged':
    case 'create_sprint':
      return 'Start validation sprint'
    default:
      return type.replace(/([A-Z])/g, ' $1').trim()
  }
}
