/**
 * Bridge Command Center entities → FounderObjects.
 */
import type { CCCaptureItem, CCProject, CCTask } from '@/lib/command-center/types'
import type { CaptureType } from '@/lib/command-center/types'
import type { CreateObjectInput, FounderObjectType, ObjectStatus } from './objectTypes'

function mapTaskStatus(status: CCTask['status']): ObjectStatus {
  if (status === 'done') return 'completed'
  if (status === 'in_progress') return 'active'
  return 'active'
}

function mapProjectStatus(status: CCProject['status']): ObjectStatus {
  if (status === 'completed') return 'completed'
  if (status === 'paused') return 'inactive'
  return 'active'
}

function captureTypeToObjectType(type: CaptureType): FounderObjectType {
  if (type === 'question') return 'capture'
  return type
}

export function taskToObjectInput(task: CCTask): CreateObjectInput {
  return {
    id: task.id,
    type: 'task',
    title: task.title,
    area: task.area,
    status: mapTaskStatus(task.status),
    priority: task.priority,
    tags: [],
    source: 'command_center',
    metadata: {
      commandCenterId: task.id,
      dueDate: task.dueDate,
      projectId: task.projectId,
      taskStatus: task.status,
    },
  }
}

export function projectToObjectInput(project: CCProject): CreateObjectInput {
  return {
    id: project.id,
    type: 'project',
    title: project.name,
    summary: project.outcome || undefined,
    content: project.nextAction || undefined,
    area: project.area,
    status: mapProjectStatus(project.status),
    tags: [],
    source: 'command_center',
    metadata: {
      commandCenterId: project.id,
      nextAction: project.nextAction,
      outcome: project.outcome,
      projectStatus: project.status,
    },
  }
}

export function captureToObjectInput(capture: CCCaptureItem): CreateObjectInput {
  return {
    id: capture.id,
    type: captureTypeToObjectType(capture.type),
    title: capture.content.slice(0, 80) + (capture.content.length > 80 ? '…' : ''),
    content: capture.content,
    status: capture.status === 'inbox' ? 'inbox' : 'active',
    tags: [capture.type],
    source: 'quick_capture',
    metadata: {
      commandCenterId: capture.id,
      captureType: capture.type,
      captureStatus: capture.status,
    },
  }
}

export function taskPatchFromObject(updates: Partial<ReturnType<typeof taskToObjectInput>>): Partial<CCTask> | null {
  const patch: Partial<CCTask> = {}
  if (updates.title) patch.title = updates.title
  if (updates.area) patch.area = updates.area
  if (updates.priority) patch.priority = updates.priority
  if (updates.status === 'completed') patch.status = 'done'
  if (updates.status === 'active') patch.status = 'in_progress'
  return Object.keys(patch).length ? patch : null
}

export function projectPatchFromObject(updates: Partial<CreateObjectInput>): Partial<CCProject> | null {
  const patch: Partial<CCProject> = {}
  if (updates.title) patch.name = updates.title
  if (updates.summary !== undefined) patch.outcome = updates.summary
  if (updates.content !== undefined) patch.nextAction = updates.content
  if (updates.area) patch.area = updates.area
  if (updates.status === 'completed') patch.status = 'completed'
  if (updates.status === 'inactive') patch.status = 'paused'
  if (updates.status === 'active') patch.status = 'active'
  return Object.keys(patch).length ? patch : null
}
