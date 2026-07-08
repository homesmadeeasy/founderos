import { getObjectsSupporting } from '@/lib/object-engine/objectRelationships'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type { AttentionScore, ExecutiveContext } from './executiveTypes'
import {
  clampScore,
  countRecentMemoriesForObject,
  getCcTaskForObject,
  getTaskDueDate,
  isActiveGoalObject,
  isActiveProjectObject,
  isFounderOSObject,
  isHealthObject,
  isOpenTaskObject,
  isSchoolObject,
  scoreFromPriority,
  taskUrgencyFromDates,
} from './executiveUtils'

const WEIGHTS = {
  urgency: 0.25,
  importance: 0.2,
  strategicValue: 0.2,
  risk: 0.15,
  momentum: 0.1,
  energyFit: 0.1,
}

function scoreUrgency(object: FounderObject, context: ExecutiveContext): number {
  if (!isOpenTaskObject(object)) {
    if (isActiveProjectObject(object)) {
      const hasOverdue = context.openTasks.some(t =>
        t.relationships.some(r => r.toObjectId === object.id)
        || object.relationships.some(r => r.toObjectId === t.id),
      )
      return hasOverdue ? 70 : 50
    }
    return 40
  }

  const ccTask = getCcTaskForObject(object, context.commandCenter.tasks)
  const due = getTaskDueDate(object) ?? ccTask?.dueDate ?? null
  let score = taskUrgencyFromDates(due, context.date)

  if (ccTask?.priority === 'high' || object.priority === 'high') score = Math.max(score, 80)
  return clampScore(score)
}

function scoreImportance(object: FounderObject, context: ExecutiveContext): number {
  let score = scoreFromPriority(object.priority)

  if (isActiveGoalObject(object)) {
    const supporters = getObjectsSupporting(object, context.objects).filter(isOpenTaskObject)
    score = supporters.length > 0 ? 90 : 65
  }
  if (isActiveProjectObject(object)) score = Math.max(score, 75)
  if (isFounderOSObject(object)) score = Math.max(score, 95)

  const criticalMemories = context.memories.filter(m =>
    m.relatedObjectIds.includes(object.id) && m.importance === 'critical',
  )
  if (criticalMemories.length > 0) score = Math.max(score, 85)

  return clampScore(score)
}

function scoreStrategicValue(object: FounderObject): number {
  if (isFounderOSObject(object)) return 95
  if (object.area === 'systems') return 80
  if (isActiveGoalObject(object)) return 75
  if (isActiveProjectObject(object)) return 70
  if (object.type === 'decision') return 55
  return 40
}

function scoreRisk(object: FounderObject, context: ExecutiveContext): number {
  let score = 30

  if (isOpenTaskObject(object)) {
    const ccTask = getCcTaskForObject(object, context.commandCenter.tasks)
    const due = getTaskDueDate(object) ?? ccTask?.dueDate ?? null
    if (due && taskUrgencyFromDates(due, context.date) >= 90) score = 90
    else if (object.priority === 'high') score = 70
  }

  if (isSchoolObject(object) && isOpenTaskObject(object)) score = Math.max(score, 75)

  const blocked = context.blockers.some(b => b.relatedObjectIds.includes(object.id))
  if (blocked) score = Math.max(score, 80)

  if (isHealthObject(object) && context.healthSignals && context.healthSignals.score < 50) {
    score = Math.max(score, 85)
  }

  return clampScore(score)
}

function scoreMomentum(object: FounderObject, context: ExecutiveContext): number {
  const recentCount = countRecentMemoriesForObject(object.id, context.memories, 7)
  let score = 40 + recentCount * 12

  if (context.recentMemories.some(m => m.relatedObjectIds.includes(object.id))) {
    score += 15
  }
  if (isActiveProjectObject(object) && recentCount > 0) score += 10
  return clampScore(score)
}

function scoreEnergyFit(object: FounderObject, context: ExecutiveContext): number {
  const health = context.healthSignals
  if (!health) return 60

  if (health.score < 50) {
    if (isHealthObject(object) || object.area === 'health') return 90
    if (isOpenTaskObject(object) && object.priority === 'high' && !isHealthObject(object)) return 35
    return 55
  }

  if (isFounderOSObject(object) && health.score >= 60) return 85
  return 65
}

function buildExplanation(
  object: FounderObject,
  scores: Omit<AttentionScore, 'objectId' | 'totalScore' | 'explanation'>,
): string {
  const parts: string[] = []
  if (scores.urgency >= 80) parts.push('time-sensitive')
  if (scores.importance >= 80) parts.push('high importance')
  if (scores.strategicValue >= 85) parts.push('strategically central')
  if (scores.risk >= 75) parts.push('elevated risk if ignored')
  if (scores.momentum >= 70) parts.push('recent activity')
  if (scores.energyFit >= 80) parts.push('good energy fit today')
  if (scores.energyFit <= 40) parts.push('poor energy fit — consider deferring')

  if (parts.length === 0) {
    return `${object.title} is a moderate-priority ${object.type}.`
  }
  return `${object.title}: ${parts.join(', ')}.`
}

export function scoreObjectAttention(
  object: FounderObject,
  context: ExecutiveContext,
): AttentionScore {
  const urgency = scoreUrgency(object, context)
  const importance = scoreImportance(object, context)
  const strategicValue = scoreStrategicValue(object)
  const risk = scoreRisk(object, context)
  const momentum = scoreMomentum(object, context)
  const energyFit = scoreEnergyFit(object, context)

  const totalScore = clampScore(
    urgency * WEIGHTS.urgency
    + importance * WEIGHTS.importance
    + strategicValue * WEIGHTS.strategicValue
    + risk * WEIGHTS.risk
    + momentum * WEIGHTS.momentum
    + energyFit * WEIGHTS.energyFit,
  )

  const partial = { urgency, importance, strategicValue, risk, momentum, energyFit }

  return {
    objectId: object.id,
    ...partial,
    totalScore,
    explanation: buildExplanation(object, partial),
  }
}

export function scoreAllObjects(context: ExecutiveContext): AttentionScore[] {
  const scorable = context.objects.filter(o =>
    isOpenTaskObject(o)
    || isActiveProjectObject(o)
    || isActiveGoalObject(o)
    || (o.type === 'habit' && o.status === 'active'),
  )

  return scorable
    .map(o => scoreObjectAttention(o, context))
    .sort((a, b) => b.totalScore - a.totalScore)
}
