import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import { isDueToday, isOverdue, todayISO } from '@/lib/command-center/utils'
import type { CCTask } from '@/lib/command-center/types'

export function newExecutiveId(prefix = 'exec'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function formatExecutiveDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function isFounderOSObject(object: FounderObject): boolean {
  const title = object.title.toLowerCase()
  return title.includes('founderos') || title.includes('ascendos')
}

export function isSchoolObject(object: FounderObject): boolean {
  const title = object.title.toLowerCase()
  return title.includes('year 12') || title.includes('school') || object.area === 'knowledge'
}

export function isHealthObject(object: FounderObject): boolean {
  return object.area === 'health'
    || object.type === 'workout'
    || object.type === 'habit'
    || object.title.toLowerCase().includes('model protocol')
}

export function daysSince(iso: string): number {
  const then = new Date(iso).getTime()
  const now = Date.now()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

export function getTaskDueDate(object: FounderObject): string | null {
  const due = object.metadata?.dueDate
  return typeof due === 'string' ? due : null
}

export function getCcTaskForObject(
  object: FounderObject,
  tasks: CCTask[],
): CCTask | undefined {
  return tasks.find(t => t.id === object.id)
}

export function countRecentMemoriesForObject(
  objectId: string,
  memories: MemoryRecord[],
  withinDays = 7,
): number {
  return memories.filter(m =>
    m.relatedObjectIds.includes(objectId)
    && daysSince(m.occurredAt) <= withinDays,
  ).length
}

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function scoreFromPriority(priority?: string): number {
  if (priority === 'high') return 85
  if (priority === 'medium') return 55
  if (priority === 'low') return 30
  return 45
}

export function isOpenTaskObject(object: FounderObject): boolean {
  return object.type === 'task'
    && object.status !== 'completed'
    && object.status !== 'archived'
}

export function isActiveProjectObject(object: FounderObject): boolean {
  return object.type === 'project' && object.status === 'active'
}

export function isActiveGoalObject(object: FounderObject): boolean {
  return object.type === 'goal' && object.status === 'active'
}

export function taskUrgencyFromDates(
  dueDate: string | null,
  today = todayISO(),
): number {
  if (!dueDate) return 35
  if (isOverdue(dueDate, today)) return 100
  if (isDueToday(dueDate, today)) return 90
  const days = Math.ceil(
    (new Date(dueDate.slice(0, 10)).getTime() - new Date(today).getTime())
    / (1000 * 60 * 60 * 24),
  )
  if (days <= 3) return 75
  if (days <= 7) return 60
  return 40
}
