import type {
  AttentionScore,
  ExecutiveBriefing,
  ExecutiveContext,
  ExecutiveRecommendation,
} from './executiveTypes'
import { getFounderOSProject } from './executiveContext'
import { formatExecutiveDate, newExecutiveId, nowISO } from './executiveUtils'
import { formatKnowledgeForBriefing } from './knowledgeIntegration'

export function generateDailyExecutiveBriefing(
  context: ExecutiveContext,
  recommendations: ExecutiveRecommendation[],
  attentionScores: AttentionScore[],
  warnings: string[],
): ExecutiveBriefing {
  const top = attentionScores.slice(0, 3)
  const topTitles = top
    .map(s => context.objects.find(o => o.id === s.objectId)?.title)
    .filter(Boolean) as string[]

  const priorities: string[] = []
  if (context.userMission) priorities.push(`Mission: ${context.userMission}`)
  for (const rec of recommendations.filter(r => r.priority !== 'low').slice(0, 3)) {
    priorities.push(rec.title)
  }
  if (priorities.length === 0 && topTitles.length > 0) {
    priorities.push(...topTitles.map(t => `Focus: ${t}`))
  }

  const opportunities: string[] = []
  const founder = getFounderOSProject(context)
  if (founder && context.recentMemories.some(m => m.relatedObjectIds.includes(founder.id))) {
    opportunities.push(`FounderOS has recent momentum — good day for deep product work on "${founder.title}".`)
  }
  if (context.healthSignals && context.healthSignals.score >= 70) {
    opportunities.push('Health signals are solid — you can sustain a longer deep-work block.')
  }
  const recentInsight = context.recentMemories.find(m => m.type === 'insight' || m.type === 'decision')
  if (recentInsight) {
    opportunities.push(`Leverage recent insight: "${recentInsight.title}".`)
  }
  if (context.activeGoals.length > 0 && context.openTasks.length > 0) {
    opportunities.push(`${context.openTasks.length} open tasks can advance ${context.activeGoals.length} active goal(s).`)
  }
  if (context.relevantKnowledge.length > 0) {
    opportunities.push(
      `Guiding knowledge: ${formatKnowledgeForBriefing(context.relevantKnowledge).slice(0, 2).join(' ')}`,
    )
  }
  if (opportunities.length === 0) {
    opportunities.push('Clear headroom today — define one high-leverage next action per active project.')
  }

  const memoryNote = context.recentMemories.length > 0
    ? ` ${context.recentMemories.length} recent memories inform this briefing.`
    : ''

  const knowledgeNote = context.relevantKnowledge.length > 0
    ? ` ${context.relevantKnowledge.length} knowledge principle(s) inform priorities.`
    : ''

  const summaryParts = [
    context.userMission
      ? `Today's mission anchors your execution.`
      : `No mission set — recommendations drive priority.`,
    topTitles.length > 0
      ? `Top attention: ${topTitles.join(', ')}.`
      : null,
    context.blockers.length > 0
      ? `${context.blockers.length} blocker(s) need resolution.`
      : null,
    memoryNote.trim(),
    knowledgeNote.trim(),
  ].filter(Boolean)

  return {
    id: newExecutiveId('brief'),
    type: 'daily',
    title: `Daily Executive Briefing — ${formatExecutiveDate(new Date(context.date))}`,
    summary: summaryParts.join(' '),
    priorities,
    warnings,
    opportunities,
    recommendations,
    generatedAt: nowISO(),
  }
}
