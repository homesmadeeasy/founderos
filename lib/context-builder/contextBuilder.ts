import { todayISO } from '@/lib/command-center/utils'
import { findRelevantKnowledge } from '@/lib/executive-engine/knowledgeIntegration'
import { createExecutiveContext } from '@/lib/executive-engine/executiveContext'
import { sortMemoriesByOccurred } from '@/lib/memory-engine/memorySearch'
import type {
  BuildDailyContextInput,
  ContextBlocker,
  ContextOpportunity,
  DailyContext,
} from './contextTypes'
import { scoreDailyContext } from './contextScoring'
import { newContextId, nowISO } from './contextUtils'
import {
  isActiveGoalObject,
  isActiveProjectObject,
  isFounderOSObject,
  isOpenTaskObject,
} from '@/lib/executive-engine/executiveUtils'
import { buildMorningSignalNotes } from '@/lib/signal-engine/signalSearch'
import { getSignals, getRecentSignals } from '@/lib/signal-engine/signalStorage'

function buildHealthFromCommandCenter(
  input: BuildDailyContextInput,
): DailyContext['healthSignals'] {
  if (input.healthSignals) return input.healthSignals
  const today = todayISO()
  const log = input.commandCenterState.dailyLogs.find(l => l.date === today)
  if (!log) return null

  let score = 70
  const notes: string[] = []
  if (log.sleepHours != null && log.sleepHours < 6) { score -= 20; notes.push('low sleep') }
  if (!log.workoutCompleted) { score -= 15; notes.push('workout pending') }
  if (log.proteinGrams != null && log.proteinGrams < 120) {
    score -= 10
    notes.push('protein below target')
  }

  return {
    sleepHours: log.sleepHours,
    workoutCompleted: log.workoutCompleted,
    proteinGrams: log.proteinGrams,
    waterLitres: log.waterLitres,
    mood: log.mood,
    score: Math.max(0, Math.min(100, score)),
    summary: notes.length > 0 ? notes.join(', ') : 'Health logged today.',
  }
}

function buildBlockers(input: BuildDailyContextInput): ContextBlocker[] {
  const blockers: ContextBlocker[] = []

  for (const warning of input.executiveState.warnings) {
    blockers.push({
      id: newContextId('block'),
      title: warning.slice(0, 80),
      reason: warning,
      severity: warning.toLowerCase().includes('health') ? 'high' : 'medium',
      relatedObjectIds: [],
    })
  }

  for (const project of input.objects.filter(isActiveProjectObject)) {
    const hasTask = input.objects.some(t =>
      isOpenTaskObject(t)
      && (t.relationships.some(r => r.toObjectId === project.id)
        || project.relationships.some(r => r.toObjectId === t.id)),
    )
    if (!hasTask && !project.metadata?.nextAction) {
      blockers.push({
        id: newContextId('block'),
        title: project.title,
        reason: 'Stalled project — no next action',
        severity: 'medium',
        relatedObjectIds: [project.id],
      })
    }
  }

  return blockers.slice(0, 8)
}

function buildOpportunities(input: BuildDailyContextInput): ContextOpportunity[] {
  const opportunities: ContextOpportunity[] = []
  const recent = sortMemoriesByOccurred(input.memories).slice(0, 10)

  const founderProject = input.objects.find(o => isActiveProjectObject(o) && isFounderOSObject(o))
  if (founderProject && recent.some(m => m.relatedObjectIds.includes(founderProject.id))) {
    opportunities.push({
      id: newContextId('opp'),
      title: `${founderProject.title} momentum`,
      reason: 'Recent memories show activity on your core systems project.',
      relatedObjectIds: [founderProject.id],
      relatedKnowledgeIds: input.knowledge
        .filter(k => k.domain === 'founder' || k.domain === 'systems')
        .slice(0, 2)
        .map(k => k.id),
    })
  }

  for (const k of input.knowledge.filter(k => k.confidence === 'high').slice(0, 3)) {
    opportunities.push({
      id: newContextId('opp'),
      title: k.title,
      reason: `Apply principle: ${k.principle}`,
      relatedObjectIds: k.relatedObjectIds,
      relatedKnowledgeIds: [k.id],
    })
  }

  if (input.healthSignals && input.healthSignals.score >= 70) {
    opportunities.push({
      id: newContextId('opp'),
      title: 'Strong health baseline',
      reason: 'Good conditions for a deep-work block today.',
      relatedObjectIds: [],
      relatedKnowledgeIds: input.knowledge
        .filter(k => k.title.toLowerCase().includes('health'))
        .map(k => k.id),
    })
  }

  return opportunities.slice(0, 6)
}

export function buildDailyContext(input: BuildDailyContextInput): DailyContext {
  const today = todayISO()
  const healthSignals = buildHealthFromCommandCenter(input)

  const execCtx = createExecutiveContext({
    objects: input.objects,
    memories: input.memories,
    knowledge: input.knowledge,
    commandCenterState: input.commandCenterState,
  })

  const mission = input.commandCenterState.missionDate === today
    ? input.commandCenterState.mission.trim()
    : ''

  const openTasks = input.objects.filter(isOpenTaskObject)
  const ccOpenTasks = input.commandCenterState.tasks.filter(t => t.status !== 'done')
  if (ccOpenTasks.length > openTasks.length) {
    // CC tasks may exist without object sync — context still uses object tasks primarily
  }

  const recentMemories = sortMemoriesByOccurred(input.memories).slice(0, 10)
  const relevantKnowledge = findRelevantKnowledge(execCtx)
  const unresolvedCaptures = input.commandCenterState.captureItems.filter(
    c => c.status === 'inbox',
  )

  const recentSignals = getRecentSignals(20)
  const signalNotes = buildMorningSignalNotes(getSignals())

  const context: DailyContext = {
    id: newContextId('daily'),
    date: today,
    mission,
    activeProjects: input.objects.filter(isActiveProjectObject),
    activeGoals: input.objects.filter(isActiveGoalObject),
    openTasks,
    recentMemories,
    relevantKnowledge,
    executiveRecommendations: input.executiveState.recommendations,
    healthSignals,
    blockers: buildBlockers({ ...input, healthSignals }),
    opportunities: buildOpportunities({ ...input, healthSignals }),
    unresolvedCaptures,
    recentSignals,
    signalNotes,
    contextScore: 0,
    generatedAt: nowISO(),
  }

  context.contextScore = scoreDailyContext(context)
  return context
}
