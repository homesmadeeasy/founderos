import type { CCTask } from '@/lib/command-center/types'
import { isOverdue, todayISO } from '@/lib/command-center/utils'
import { sortMemoriesByOccurred } from '@/lib/memory-engine/memorySearch'
import { getObjectsSupporting } from '@/lib/object-engine/objectRelationships'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type {
  CreateExecutiveContextInput,
  ExecutiveBlocker,
  ExecutiveContext,
  HealthSignals,
} from './executiveTypes'
import {
  getCcTaskForObject,
  getTaskDueDate,
  isActiveGoalObject,
  isActiveProjectObject,
  isFounderOSObject,
  isOpenTaskObject,
} from './executiveUtils'
import { findRelevantKnowledge } from './knowledgeIntegration'

function buildHealthSignals(
  commandCenterState: CreateExecutiveContextInput['commandCenterState'],
): HealthSignals | null {
  const today = todayISO()
  const log = commandCenterState.dailyLogs.find(l => l.date === today)
  if (!log) return null

  let score = 70
  const notes: string[] = []

  if (log.sleepHours != null) {
    if (log.sleepHours < 6) { score -= 20; notes.push('low sleep') }
    else if (log.sleepHours >= 7) { score += 10; notes.push('adequate sleep') }
  }
  if (!log.workoutCompleted) { score -= 15; notes.push('workout pending') }
  else { score += 10; notes.push('workout done') }
  if (log.proteinGrams != null && log.proteinGrams < 120) {
    score -= 10
    notes.push('protein below target')
  }
  if (log.mood.toLowerCase().includes('tired') || log.mood.toLowerCase().includes('low')) {
    score -= 10
    notes.push('low mood reported')
  }

  return {
    sleepHours: log.sleepHours,
    workoutCompleted: log.workoutCompleted,
    proteinGrams: log.proteinGrams,
    waterLitres: log.waterLitres,
    mood: log.mood,
    score: Math.max(0, Math.min(100, score)),
    summary: notes.length > 0 ? notes.join(', ') : 'Baseline health signals logged.',
  }
}

function identifyBlockers(
  objects: FounderObject[],
  memories: import('@/lib/memory-engine/memoryTypes').MemoryRecord[],
  ccTasks: CCTask[],
  today: string,
): ExecutiveBlocker[] {
  const blockers: ExecutiveBlocker[] = []

  for (const task of ccTasks.filter(t => t.status !== 'done' && isOverdue(t.dueDate, today))) {
    blockers.push({
      id: `blocker-task-${task.id}`,
      title: task.title,
      reason: 'Overdue task in Command Center',
      relatedObjectIds: [task.id],
      severity: 'high',
    })
  }

  for (const obj of objects.filter(o => isOpenTaskObject(o))) {
    const due = getTaskDueDate(obj) ?? getCcTaskForObject(obj, ccTasks)?.dueDate ?? null
    if (due && isOverdue(due, today)) {
      blockers.push({
        id: `blocker-obj-${obj.id}`,
        title: obj.title,
        reason: 'Overdue task object',
        relatedObjectIds: [obj.id],
        severity: 'high',
      })
    }
  }

  const blockingRels = objects.flatMap(o =>
    o.relationships
      .filter(r => r.type === 'blocks')
      .map(r => ({ from: o, rel: r })),
  )
  for (const { from, rel } of blockingRels) {
    const blocked = objects.find(o => o.id === rel.toObjectId)
    if (blocked && isOpenTaskObject(blocked)) {
      blockers.push({
        id: `blocker-rel-${rel.id}`,
        title: blocked.title,
        reason: `Blocked by "${from.title}"`,
        relatedObjectIds: [blocked.id, from.id],
        severity: 'medium',
      })
    }
  }

  for (const project of objects.filter(isActiveProjectObject)) {
    const nextAction = project.metadata?.nextAction
    const hasOpenTask = objects.some(o =>
      isOpenTaskObject(o)
      && (o.relationships.some(r => r.toObjectId === project.id && r.type === 'belongs_to')
        || project.relationships.some(r => r.toObjectId === o.id)),
    )
    if (!nextAction && !hasOpenTask) {
      blockers.push({
        id: `blocker-project-${project.id}`,
        title: project.title,
        reason: 'Active project with no next action or open task',
        relatedObjectIds: [project.id],
        severity: 'medium',
      })
    }
  }

  const inboxCaptures = memories.filter(m => m.type === 'capture' && m.importance === 'high')
  if (inboxCaptures.length >= 3) {
    blockers.push({
      id: 'blocker-inbox',
      title: 'Unprocessed high-importance captures',
      reason: `${inboxCaptures.length} important captures need triage`,
      relatedObjectIds: inboxCaptures.flatMap(m => m.relatedObjectIds),
      severity: 'low',
    })
  }

  return blockers
}

export function createExecutiveContext(input: CreateExecutiveContextInput): ExecutiveContext {
  const { objects, memories, knowledge, commandCenterState } = input
  const today = todayISO()

  const activeGoals = objects.filter(isActiveGoalObject)
  const activeProjects = objects.filter(isActiveProjectObject)
  const openTasks = objects.filter(isOpenTaskObject)

  const sortedMemories = sortMemoriesByOccurred(memories)
  const recentMemories = sortedMemories.slice(0, 10)
  const recentDecisions = sortedMemories.filter(m => m.type === 'decision').slice(0, 8)

  const healthSignals = buildHealthSignals(commandCenterState)
  const blockers = identifyBlockers(objects, memories, commandCenterState.tasks, today)

  const userMission = commandCenterState.missionDate === today
    ? commandCenterState.mission.trim()
    : ''

  const goalsWithoutSupport = activeGoals.filter(goal => {
    const supporters = getObjectsSupporting(goal, objects).filter(isOpenTaskObject)
    return supporters.length === 0
  })
  for (const goal of goalsWithoutSupport) {
    if (!blockers.some(b => b.relatedObjectIds.includes(goal.id))) {
      blockers.push({
        id: `blocker-goal-${goal.id}`,
        title: goal.title,
        reason: 'Long-term goal has no active supporting tasks',
        relatedObjectIds: [goal.id],
        severity: 'medium',
      })
    }
  }

  const base: ExecutiveContext = {
    date: today,
    objects,
    memories,
    knowledge,
    relevantKnowledge: [],
    activeGoals,
    activeProjects,
    openTasks,
    recentMemories,
    recentDecisions,
    healthSignals,
    blockers,
    userMission,
    captures: commandCenterState.captureItems,
    commandCenter: commandCenterState,
  }

  base.relevantKnowledge = findRelevantKnowledge(base)
  return base
}

export function getFounderOSProject(context: ExecutiveContext): FounderObject | undefined {
  return context.activeProjects.find(isFounderOSObject)
    ?? context.objects.find(o => o.type === 'project' && isFounderOSObject(o))
}
