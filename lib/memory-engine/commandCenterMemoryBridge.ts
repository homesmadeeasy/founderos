import type { CCCaptureItem, CCProject, CCDailyLog, CCTask } from '@/lib/command-center/types'
import type { CaptureType } from '@/lib/command-center/types'
import type { CreateMemoryInput } from './memoryTypes'
import { nowISO, todayISO } from './memoryUtils'

export function memoryForMissionSet(mission: string): CreateMemoryInput | null {
  const trimmed = mission.trim()
  if (!trimmed) return null
  return {
    type: 'reflection',
    title: 'Today\'s mission set',
    content: trimmed,
    summary: 'Daily mission anchor recorded.',
    importance: 'high',
    area: 'systems',
    source: 'command_center',
    relatedObjectIds: [],
    tags: ['mission', 'daily', `dedupe:mission-${todayISO()}`],
    occurredAt: nowISO(),
  }
}

export function memoryForTaskAdded(task: CCTask): CreateMemoryInput {
  return {
    type: 'task_update',
    title: `Task added: ${task.title}`,
    content: `Priority: ${task.priority}. Area: ${task.area}.`,
    importance: task.priority === 'high' ? 'high' : 'medium',
    area: task.area,
    source: 'command_center',
    relatedObjectIds: task.projectId ? [task.projectId] : [],
    tags: ['task', 'added', `dedupe:task-add-${task.id}`],
    occurredAt: nowISO(),
  }
}

export function memoryForTaskUpdated(task: CCTask, patch: Partial<CCTask>): CreateMemoryInput | null {
  if (patch.status === 'done') {
    return {
      type: 'task_update',
      title: `Task completed: ${task.title}`,
      content: 'Marked complete in Command Center.',
      importance: 'medium',
      area: task.area,
      source: 'command_center',
      relatedObjectIds: task.projectId ? [task.projectId, task.id] : [task.id],
      tags: ['task', 'completed', `dedupe:task-done-${task.id}`],
      occurredAt: nowISO(),
    }
  }
  return null
}

export function memoryForProjectAdded(project: CCProject): CreateMemoryInput {
  return {
    type: 'project_update',
    title: `Project added: ${project.name}`,
    content: project.outcome || `New active project in ${project.area}.`,
    importance: 'medium',
    area: project.area,
    source: 'command_center',
    relatedObjectIds: [project.id],
    tags: ['project', 'added', `dedupe:project-add-${project.id}`],
    occurredAt: nowISO(),
  }
}

export function memoryForProjectUpdated(project: CCProject): CreateMemoryInput {
  return {
    type: 'project_update',
    title: `Project updated: ${project.name}`,
    content: project.nextAction ? `Next action: ${project.nextAction}` : 'Project details updated.',
    importance: 'low',
    area: project.area,
    source: 'command_center',
    relatedObjectIds: [project.id],
    tags: ['project', 'updated', `dedupe:project-upd-${project.id}`],
    occurredAt: nowISO(),
  }
}

export function memoryForCapture(capture: CCCaptureItem): CreateMemoryInput {
  const typeMap: Record<CaptureType, CreateMemoryInput['type']> = {
    idea: 'capture',
    task: 'task_update',
    note: 'capture',
    decision: 'decision',
    question: 'capture',
  }
  return {
    type: typeMap[capture.type],
    title: `${capture.type} captured: ${capture.content.slice(0, 60)}${capture.content.length > 60 ? '…' : ''}`,
    content: capture.content,
    importance: capture.type === 'decision' ? 'high' : 'medium',
    area: undefined,
    source: capture.type === 'decision' ? 'quick_capture' : 'command_center',
    relatedObjectIds: [capture.id],
    tags: ['capture', capture.type, `dedupe:capture-${capture.id}`],
    occurredAt: nowISO(),
  }
}

export function memoryForHealthLog(log: CCDailyLog): CreateMemoryInput {
  const parts: string[] = []
  if (log.sleepHours != null) parts.push(`Sleep: ${log.sleepHours}h`)
  if (log.proteinGrams != null) parts.push(`Protein: ${log.proteinGrams}g`)
  if (log.waterLitres != null) parts.push(`Water: ${log.waterLitres}L`)
  if (log.weight != null) parts.push(`Weight: ${log.weight}kg`)
  if (log.workoutCompleted) parts.push('Workout completed')
  return {
    type: 'health_log',
    title: 'Health snapshot saved',
    content: parts.join(' · ') || 'Daily health log updated.',
    importance: 'medium',
    area: 'health',
    source: 'daily_log',
    relatedObjectIds: [],
    tags: ['health', 'daily', `dedupe:health-${log.date}`],
    occurredAt: nowISO(),
  }
}
