import type { DailyContext } from '@/lib/context-builder/contextTypes'
import type { TomorrowContextData } from '@/lib/daily-learning-loop/dailyLoopTypes'
import { isFounderOSObject, isOpenTaskObject } from '@/lib/executive-engine/executiveUtils'
import type { DailyReasoningOutput, RecommendedPlanItem } from './reasoningTypes'
import { newReasoningId, nowISO } from './reasoningUtils'

function pickPrimaryFocus(
  context: DailyContext,
  tomorrowContext?: TomorrowContextData | null,
): {
  title: string
  objectId?: string
  knowledgeIds: string[]
  memoryIds: string[]
  reason: string
} {
  if (tomorrowContext?.suggestedFocus) {
    return {
      title: tomorrowContext.suggestedFocus,
      knowledgeIds: context.relevantKnowledge.map(k => k.id),
      memoryIds: context.recentMemories.slice(0, 2).map(m => m.id),
      reason: tomorrowContext.notes
        ? `Carried from yesterday: ${tomorrowContext.notes}`
        : 'Suggested focus from yesterday evening review.',
    }
  }

  const execPrimary = context.executiveRecommendations.find(r => r.priority === 'high')
  if (execPrimary) {
    return {
      title: execPrimary.title.replace(/^Primary focus:\s*/i, ''),
      objectId: execPrimary.relatedObjectIds[0],
      knowledgeIds: [],
      memoryIds: execPrimary.relatedMemoryIds,
      reason: execPrimary.rationale,
    }
  }

  const topTask = context.openTasks.find(t => t.priority === 'high') ?? context.openTasks[0]
  if (topTask) {
    const memIds = context.recentMemories
      .filter(m => m.relatedObjectIds.includes(topTask.id))
      .map(m => m.id)
    return {
      title: topTask.title,
      objectId: topTask.id,
      knowledgeIds: context.relevantKnowledge.map(k => k.id),
      memoryIds: memIds,
      reason: `Highest-priority open task. Context score: ${context.contextScore}/100.`,
    }
  }

  const founder = context.activeProjects.find(isFounderOSObject)
  if (founder) {
    return {
      title: founder.title,
      objectId: founder.id,
      knowledgeIds: context.relevantKnowledge.map(k => k.id),
      memoryIds: [],
      reason: 'No open tasks — default to core FounderOS project.',
    }
  }

  return {
    title: context.mission || 'Set your morning mission',
    knowledgeIds: context.relevantKnowledge.map(k => k.id),
    memoryIds: [],
    reason: 'Insufficient task data — anchor on mission.',
  }
}

function buildPlanItems(
  context: DailyContext,
  primary: ReturnType<typeof pickPrimaryFocus>,
  tomorrowContext?: TomorrowContextData | null,
): RecommendedPlanItem[] {
  const items: RecommendedPlanItem[] = []

  for (const carryTitle of tomorrowContext?.carryOverPriorities ?? []) {
    if (carryTitle === primary.title) continue
    items.push({
      id: newReasoningId('plan'),
      title: carryTitle,
      reason: 'Carried over from yesterday evening review.',
      priority: 'high',
      estimatedMinutes: 60,
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedKnowledgeIds: [],
    })
  }

  items.push({
    id: newReasoningId('plan'),
    title: primary.title,
    reason: primary.reason,
    priority: 'high',
    estimatedMinutes: 90,
    relatedObjectIds: primary.objectId ? [primary.objectId] : [],
    relatedMemoryIds: primary.memoryIds,
    relatedKnowledgeIds: primary.knowledgeIds,
  })

  const secondaryTasks = context.openTasks
    .filter(t => t.id !== primary.objectId)
    .slice(0, 2)
  for (const task of secondaryTasks) {
    items.push({
      id: newReasoningId('plan'),
      title: task.title,
      reason: `Secondary open task (${task.priority ?? 'medium'} priority).`,
      area: task.area,
      priority: 'medium',
      estimatedMinutes: 45,
      relatedObjectIds: [task.id],
      relatedMemoryIds: context.recentMemories
        .filter(m => m.relatedObjectIds.includes(task.id))
        .slice(0, 2)
        .map(m => m.id),
      relatedKnowledgeIds: [],
    })
  }

  if (context.healthSignals && context.healthSignals.score < 60) {
    items.push({
      id: newReasoningId('plan'),
      title: 'Health recovery block',
      reason: context.healthSignals.summary,
      area: 'health',
      priority: 'high',
      estimatedMinutes: 30,
      relatedObjectIds: [],
      relatedMemoryIds: context.recentMemories
        .filter(m => m.type === 'health_log')
        .slice(0, 1)
        .map(m => m.id),
      relatedKnowledgeIds: context.relevantKnowledge
        .filter(k => k.domain === 'health')
        .map(k => k.id),
    })
  }

  const stalled = context.blockers.find(b => b.reason.includes('Stalled'))
  if (stalled) {
    items.push({
      id: newReasoningId('plan'),
      title: `Unblock: ${stalled.title}`,
      reason: stalled.reason,
      priority: 'medium',
      estimatedMinutes: 20,
      relatedObjectIds: stalled.relatedObjectIds,
      relatedMemoryIds: [],
      relatedKnowledgeIds: [],
    })
  }

  return items.slice(0, 6)
}

export function generateDailyReasoning(
  context: DailyContext,
  tomorrowContext?: TomorrowContextData | null,
): DailyReasoningOutput {
  const primary = pickPrimaryFocus(context, tomorrowContext)
  const recommendedPlan = buildPlanItems(context, primary, tomorrowContext)

  const deferList: string[] = []
  const lowTasks = context.openTasks.filter(t => t.priority === 'low').slice(0, 3)
  if (lowTasks.length > 0) {
    deferList.push(...lowTasks.map(t => t.title))
  }
  if (context.unresolvedCaptures.length > 3) {
    deferList.push(`${context.unresolvedCaptures.length} inbox captures — process after primary work`)
  }
  const deferRec = context.executiveRecommendations.find(r =>
    r.title.toLowerCase().includes('defer'),
  )
  if (deferRec) deferList.push(deferRec.summary)

  const risks: string[] = []
  if (tomorrowContext?.warnings?.length) {
    risks.push(...tomorrowContext.warnings.slice(0, 2))
  }
  if (context.healthSignals && context.healthSignals.score < 55) {
    risks.push('Weak health signals may reduce afternoon output.')
  }
  if (context.openTasks.filter(t => t.priority === 'high').length > 4) {
    risks.push('Too many high-priority tasks — focus dilution risk.')
  }
  if (context.blockers.some(b => b.severity === 'high')) {
    risks.push('High-severity blockers need resolution before new commitments.')
  }

  const knowledgeNote = context.relevantKnowledge.length > 0
    ? ` Guided by: ${context.relevantKnowledge.map(k => k.title).join(', ')}.`
    : ''

  const memoryNote = context.recentMemories.length > 0
    ? ` ${context.recentMemories.length} recent memories inform this plan.`
    : ''

  const tomorrowNote = tomorrowContext
    ? ` Yesterday's review suggests: ${tomorrowContext.suggestedFocus}.`
    : ''

  return {
    id: newReasoningId('daily'),
    date: context.date,
    summary: [
      tomorrowContext?.recommendedMission
        ? `Mission: ${tomorrowContext.recommendedMission}.`
        : context.mission ? `Mission: ${context.mission}.` : 'No mission set.',
      `Primary focus: ${primary.title}.`,
      `${context.activeProjects.length} active projects, ${context.openTasks.length} open tasks.`,
      memoryNote.trim(),
      knowledgeNote.trim(),
      tomorrowNote.trim(),
    ].filter(Boolean).join(' '),
    primaryFocus: primary.title,
    secondaryFocuses: recommendedPlan.slice(1, 3).map(p => p.title),
    recommendedPlan,
    deferList: deferList.length > 0 ? deferList : ['Low-priority tasks and inbox noise'],
    risks,
    blockers: context.blockers.map(b => `${b.title}: ${b.reason}`),
    rationale: [
      primary.reason,
      context.relevantKnowledge[0]
        ? `Knowledge: "${context.relevantKnowledge[0].principle}"`
        : null,
      context.executiveRecommendations[0]
        ? `Executive: ${context.executiveRecommendations[0].title}`
        : null,
    ].filter(Boolean).join(' '),
    generatedAt: nowISO(),
  }
}
