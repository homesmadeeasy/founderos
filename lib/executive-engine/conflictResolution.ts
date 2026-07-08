import type { AttentionScore, ExecutiveConflictResult, ExecutiveContext } from './executiveTypes'
import {
  getCcTaskForObject,
  isFounderOSObject,
  isHealthObject,
  isOpenTaskObject,
  isSchoolObject,
} from './executiveUtils'

export function resolveExecutiveConflicts(
  context: ExecutiveContext,
  scoredObjects: AttentionScore[],
): ExecutiveConflictResult {
  const warnings: string[] = []
  const tradeoffs: string[] = []

  const highPriorityTasks = context.openTasks.filter(t => t.priority === 'high')
  if (highPriorityTasks.length > 4) {
    warnings.push(
      `You have ${highPriorityTasks.length} high-priority open tasks. Too many "urgent" items dilutes focus.`,
    )
    tradeoffs.push('Pick one primary task and explicitly defer the rest until tomorrow.')
  }

  const ccHighTasks = context.commandCenter.tasks.filter(
    t => t.status !== 'done' && t.priority === 'high',
  )
  if (ccHighTasks.length > 3 && highPriorityTasks.length <= 4) {
    warnings.push(
      `${ccHighTasks.length} high-priority Command Center tasks compete for attention.`,
    )
  }

  const health = context.healthSignals
  const intenseWorkload = highPriorityTasks.length >= 3
    || scoredObjects.filter(s => s.totalScore >= 75).length >= 4

  if (health && health.score < 55 && intenseWorkload) {
    warnings.push(
      'Health signals are weak while workload is intense. Recovery may be competing with execution.',
    )
    tradeoffs.push('Trade 60 minutes of deep work for sleep, nutrition, or a workout before pushing harder.')
  }

  const schoolTasks = context.openTasks.filter(isSchoolObject)
  const founderTasks = context.openTasks.filter(isFounderOSObject)
  const schoolUrgent = schoolTasks.some(t => {
    const cc = getCcTaskForObject(t, context.commandCenter.tasks)
    return t.priority === 'high' || cc?.priority === 'high'
  })
  const founderUrgent = founderTasks.some(t => t.priority === 'high')

  if (schoolUrgent && founderUrgent) {
    warnings.push('School deadline pressure conflicts with FounderOS deep work today.')
    tradeoffs.push('Block morning for school deadlines, afternoon for FounderOS — or vice versa based on due dates.')
  }

  const neglectedGoals = context.activeGoals.filter(goal => {
    const score = scoredObjects.find(s => s.objectId === goal.id)
    return !score || score.totalScore < 50
  })
  if (neglectedGoals.length > 0) {
    warnings.push(
      `Long-term goal${neglectedGoals.length > 1 ? 's' : ''} may be ignored: ${neglectedGoals.map(g => g.title).join(', ')}.`,
    )
    tradeoffs.push('Schedule one supporting action for each neglected goal this week.')
  }

  const projectsNoAction = context.activeProjects.filter(project => {
    const hasTask = context.openTasks.some(t =>
      t.relationships.some(r => r.toObjectId === project.id)
      || project.relationships.some(r => r.toObjectId === t.id),
    )
    const nextAction = project.metadata?.nextAction
    return !hasTask && !nextAction
  })
  if (projectsNoAction.length > 0) {
    warnings.push(
      `Projects without next actions: ${projectsNoAction.map(p => p.title).join(', ')}.`,
    )
    tradeoffs.push('Define a single next action for each stalled project before adding new work.')
  }

  if (context.blockers.length >= 3) {
    warnings.push(`${context.blockers.length} blockers detected — clear one before taking on more.`)
  }

  const healthObjects = context.objects.filter(isHealthObject)
  const healthAttention = scoredObjects.filter(s =>
    healthObjects.some(h => h.id === s.objectId) && s.totalScore >= 70,
  )
  if (health && health.score < 60 && healthAttention.length === 0 && intenseWorkload) {
    warnings.push('Poor health signals but no health-focused actions in your attention queue.')
    tradeoffs.push('Prioritize Model Protocol basics: sleep, protein, movement.')
  }

  if (warnings.length === 0) {
    tradeoffs.push('No major conflicts detected. Execute your top focus with minimal context switching.')
  }

  return { warnings, tradeoffs }
}
