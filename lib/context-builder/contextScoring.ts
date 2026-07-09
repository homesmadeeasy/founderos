import type { DailyContext } from './contextTypes'

export function scoreDailyContext(context: DailyContext): number {
  let score = 40

  if (context.mission) score += 10
  if (context.activeProjects.length > 0) score += 8
  if (context.openTasks.length > 0) score += 8
  if (context.recentMemories.length > 0) score += 6
  if (context.relevantKnowledge.length > 0) score += 8
  if (context.executiveRecommendations.length > 0) score += 10
  if (context.healthSignals) score += 5
  if (context.opportunities.length > 0) score += 5

  score -= Math.min(context.blockers.length * 3, 15)
  score -= Math.min(context.unresolvedCaptures.length, 5)

  return Math.max(0, Math.min(100, Math.round(score)))
}
