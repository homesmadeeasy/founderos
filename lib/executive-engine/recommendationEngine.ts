import type {
  AttentionScore,
  ExecutiveContext,
  ExecutiveDecision,
  ExecutiveRecommendation,
} from './executiveTypes'
import { getFounderOSProject } from './executiveContext'
import {
  getCcTaskForObject,
  isFounderOSObject,
  isHealthObject,
  isOpenTaskObject,
  newExecutiveId,
  nowISO,
} from './executiveUtils'

function topScoredObject(
  scores: AttentionScore[],
  context: ExecutiveContext,
  filter?: (id: string) => boolean,
): { objectId: string; score: AttentionScore } | null {
  for (const score of scores) {
    const obj = context.objects.find(o => o.id === score.objectId)
    if (!obj) continue
    if (filter && !filter(obj.id)) continue
    return { objectId: score.objectId, score }
  }
  return null
}

function relatedMemories(context: ExecutiveContext, objectId: string): string[] {
  return context.recentMemories
    .filter(m => m.relatedObjectIds.includes(objectId))
    .slice(0, 3)
    .map(m => m.id)
}

export function generateExecutiveRecommendations(
  context: ExecutiveContext,
  attentionScores: AttentionScore[],
): ExecutiveRecommendation[] {
  const recommendations: ExecutiveRecommendation[] = []
  const now = nowISO()

  const primary = topScoredObject(attentionScores, context, id => {
    const obj = context.objects.find(o => o.id === id)
    return !!obj && (isOpenTaskObject(obj) || obj.type === 'project')
  }) ?? topScoredObject(attentionScores, context)

  if (primary) {
    const obj = context.objects.find(o => o.id === primary.objectId)!
    const memIds = relatedMemories(context, obj.id)
    const ccTask = getCcTaskForObject(obj, context.commandCenter.tasks)

    recommendations.push({
      id: newExecutiveId('rec'),
      title: `Primary focus: ${obj.title}`,
      summary: context.userMission
        ? `Align today's work with your mission while executing "${obj.title}".`
        : `Start with "${obj.title}" — highest attention score today.`,
      rationale: [
        primary.score.explanation,
        ccTask?.dueDate ? `Due: ${ccTask.dueDate.slice(0, 10)}.` : null,
        context.userMission ? `Mission: "${context.userMission}".` : null,
        memIds.length > 0 ? `${memIds.length} recent memories support this focus.` : null,
      ].filter(Boolean).join(' '),
      confidence: primary.score.totalScore >= 75 ? 'high' : 'medium',
      priority: 'high',
      area: obj.area,
      relatedObjectIds: [obj.id],
      relatedMemoryIds: memIds,
      createdAt: now,
    })
  }

  const secondary = topScoredObject(
    attentionScores,
    context,
    id => id !== primary?.objectId,
  )
  if (secondary) {
    const obj = context.objects.find(o => o.id === secondary.objectId)!
    recommendations.push({
      id: newExecutiveId('rec'),
      title: `Secondary focus: ${obj.title}`,
      summary: `After primary work, advance "${obj.title}".`,
      rationale: secondary.score.explanation,
      confidence: 'medium',
      priority: 'medium',
      area: obj.area,
      relatedObjectIds: [obj.id],
      relatedMemoryIds: relatedMemories(context, obj.id),
      createdAt: now,
    })
  }

  if (context.healthSignals && context.healthSignals.score < 60) {
    const healthObj = context.objects.find(isHealthObject)
    recommendations.push({
      id: newExecutiveId('rec'),
      title: 'Health action: protect recovery',
      summary: context.healthSignals.summary,
      rationale: `Health score is ${context.healthSignals.score}/100. ${context.healthSignals.workoutCompleted ? 'Workout done — maintain nutrition and sleep.' : 'Complete workout and hit protein target before intense work.'}`,
      confidence: 'high',
      priority: 'high',
      area: 'health',
      relatedObjectIds: healthObj ? [healthObj.id] : [],
      relatedMemoryIds: context.recentMemories
        .filter(m => m.type === 'health_log')
        .slice(0, 2)
        .map(m => m.id),
      createdAt: now,
    })
  }

  const stalledProject = context.activeProjects.find(project => {
    const hasTask = context.openTasks.some(t =>
      project.relationships.some(r => r.toObjectId === t.id)
      || t.relationships.some(r => r.toObjectId === project.id),
    )
    return !hasTask && !project.metadata?.nextAction
  }) ?? context.activeProjects.find(p => isFounderOSObject(p))

  if (stalledProject) {
    recommendations.push({
      id: newExecutiveId('rec'),
      title: `Project action: ${stalledProject.title}`,
      summary: `Define or execute the next action on ${stalledProject.title}.`,
      rationale: stalledProject.summary
        ?? 'Active project needs a concrete next step to maintain momentum.',
      confidence: 'medium',
      priority: 'medium',
      area: stalledProject.area,
      relatedObjectIds: [stalledProject.id],
      relatedMemoryIds: relatedMemories(context, stalledProject.id),
      createdAt: now,
    })
  }

  const lowScores = attentionScores.filter(s => s.totalScore < 45).slice(0, 3)
  if (lowScores.length > 0) {
    const titles = lowScores
      .map(s => context.objects.find(o => o.id === s.objectId)?.title)
      .filter(Boolean)
    recommendations.push({
      id: newExecutiveId('rec'),
      title: 'Defer or ignore for today',
      summary: `Low-attention items: ${titles.join(', ')}.`,
      rationale: 'These objects scored below attention threshold. Defer unless a deadline forces them.',
      confidence: 'medium',
      priority: 'low',
      relatedObjectIds: lowScores.map(s => s.objectId),
      relatedMemoryIds: [],
      createdAt: now,
    })
  }

  return recommendations.slice(0, 5)
}

export function answerExecutiveQuestion(
  question: string,
  context: ExecutiveContext,
  recommendations: ExecutiveRecommendation[],
  warnings: string[],
  attentionScores: AttentionScore[],
): Omit<ExecutiveDecision, 'id' | 'createdAt'> {
  const normalized = question.trim().toLowerCase()
  const primary = recommendations.find(r => r.priority === 'high')
  const founder = getFounderOSProject(context)

  if (normalized.includes('focus') && normalized.includes('today')) {
    const top = attentionScores[0]
    const topObj = top ? context.objects.find(o => o.id === top.objectId) : null
    return {
      question,
      answer: primary
        ? `${primary.title}. ${primary.summary}`
        : topObj
          ? `Focus on "${topObj.title}" — ${top?.explanation ?? 'highest attention score.'}`
          : 'Set a mission in Command Center and pick your highest-priority open task.',
      rationale: primary?.rationale ?? top?.explanation ?? 'Based on attention scoring across objects and memories.',
      tradeoffs: warnings.slice(0, 2),
      relatedObjectIds: primary?.relatedObjectIds ?? (topObj ? [topObj.id] : []),
      relatedMemoryIds: primary?.relatedMemoryIds ?? [],
    }
  }

  if (normalized.includes('ignore') || normalized.includes('defer')) {
    const defer = recommendations.find(r => r.title.toLowerCase().includes('defer'))
    const lowTasks = context.openTasks
      .filter(t => t.priority === 'low')
      .slice(0, 3)
    return {
      question,
      answer: defer
        ? defer.summary
        : lowTasks.length > 0
          ? `Defer low-priority tasks: ${lowTasks.map(t => t.title).join(', ')}.`
          : 'Defer inbox captures and non-deadline reading until primary work is done.',
      rationale: defer?.rationale ?? 'Low attention scores and no imminent deadlines.',
      tradeoffs: ['Ignoring school deadlines or health basics will increase risk — only defer true optional work.'],
      relatedObjectIds: defer?.relatedObjectIds ?? lowTasks.map(t => t.id),
      relatedMemoryIds: [],
    }
  }

  if (normalized.includes('block')) {
    if (context.blockers.length === 0) {
      return {
        question,
        answer: 'No major blockers detected. Execute your primary focus for 25 minutes.',
        rationale: 'Blocker scan found no overdue tasks, blocking relationships, or stalled projects.',
        tradeoffs: [],
        relatedObjectIds: [],
        relatedMemoryIds: [],
      }
    }
    const top = context.blockers[0]
    return {
      question,
      answer: `${top.title}: ${top.reason}`,
      rationale: `Severity: ${top.severity}. ${context.blockers.length} total blocker(s) identified.`,
      tradeoffs: warnings.slice(0, 2),
      relatedObjectIds: top.relatedObjectIds,
      relatedMemoryIds: context.recentMemories
        .filter(m => top.relatedObjectIds.some(id => m.relatedObjectIds.includes(id)))
        .slice(0, 2)
        .map(m => m.id),
    }
  }

  if (normalized.includes('project') && normalized.includes('attention')) {
    const projectScores = attentionScores
      .filter(s => context.activeProjects.some(p => p.id === s.objectId))
      .sort((a, b) => b.totalScore - a.totalScore)
    const top = projectScores[0]
    const project = top ? context.activeProjects.find(p => p.id === top.objectId) : context.activeProjects[0]
    return {
      question,
      answer: project
        ? `${project.title} needs attention. ${project.summary ?? 'Review next action and open tasks.'}`
        : 'No active projects found.',
      rationale: top?.explanation ?? 'First active project in portfolio.',
      tradeoffs: warnings.filter(w => w.includes('project') || w.includes('next action')),
      relatedObjectIds: project ? [project.id] : [],
      relatedMemoryIds: project ? relatedMemories(context, project.id) : [],
    }
  }

  if (normalized.includes('founderos') && (normalized.includes('important') || normalized.includes('why'))) {
    const founderMemories = context.recentMemories.filter(m =>
      m.title.toLowerCase().includes('founderos')
      || m.relatedObjectIds.includes(founder?.id ?? ''),
    )
    return {
      question,
      answer: founder
        ? `FounderOS is strategically central: ${founder.summary ?? 'your AI operating system for life and execution.'}`
        : 'FounderOS is your core systems project — the foundation for Object, Memory, and Executive engines.',
      rationale: [
        'Highest strategic value in attention scoring.',
        founderMemories.length > 0
          ? `Recent memory: "${founderMemories[0].title}".`
          : 'Supports long-term AI OS goal.',
        context.recentDecisions[0]
          ? `Recent decision context: "${context.recentDecisions[0].title}".`
          : null,
      ].filter(Boolean).join(' '),
      tradeoffs: warnings.filter(w => w.includes('FounderOS') || w.includes('School')),
      relatedObjectIds: founder ? [founder.id] : [],
      relatedMemoryIds: founderMemories.slice(0, 3).map(m => m.id),
    }
  }

  const fallback = primary ?? recommendations[0]
  return {
    question,
    answer: fallback
      ? `${fallback.title}: ${fallback.summary}`
      : 'Open Executive Engine for a generated daily briefing.',
    rationale: fallback?.rationale ?? 'General executive recommendation.',
    tradeoffs: warnings.slice(0, 2),
    relatedObjectIds: fallback?.relatedObjectIds ?? [],
    relatedMemoryIds: fallback?.relatedMemoryIds ?? [],
  }
}

export function getTopFocus(
  recommendations: ExecutiveRecommendation[],
  attentionScores: AttentionScore[],
  context: ExecutiveContext,
): { title: string; summary: string; objectId?: string; score?: number } {
  const primary = recommendations.find(r => r.priority === 'high' && !r.title.includes('Health'))
    ?? recommendations[0]
  if (primary) {
    return {
      title: primary.title,
      summary: primary.summary,
      objectId: primary.relatedObjectIds[0],
      score: attentionScores.find(s => s.objectId === primary.relatedObjectIds[0])?.totalScore,
    }
  }
  const top = attentionScores[0]
  const obj = top ? context.objects.find(o => o.id === top.objectId) : null
  return {
    title: obj?.title ?? 'Set your focus',
    summary: top?.explanation ?? 'Add tasks and projects to generate focus.',
    objectId: obj?.id,
    score: top?.totalScore,
  }
}
