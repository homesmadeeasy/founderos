import { formatDisplayDate, greetingForHour, todayISO } from '@/lib/command-center/utils'
import type { DomainEvaluation } from '@/lib/domain-intelligence/domainTypes'
import type { DecisionOutput } from '@/lib/decision-engine/decisionTypes'
import type { DailyContext } from '@/lib/context-builder/contextTypes'
import type { MorningExecutionPlan } from '@/lib/morning-execution/morningTypes'
import type { DomainCoordinatorOutput } from '@/lib/domain-intelligence/domainTypes'
import type { OutcomeStats } from '@/lib/outcome-engine/outcomeTypes'

export interface HomeHealthInput {
  sleepHours?: number | null
  workoutCompleted?: boolean
}

export function getTimeOfDayGreeting(hour = new Date().getHours()): string {
  return greetingForHour(hour)
}

export function formatCurrentTime(date = new Date()): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatCurrentDate(date = new Date()): string {
  return formatDisplayDate(date)
}

export function displayNameFromEmail(email?: string | null): string {
  if (!email) return 'there'
  const local = email.split('@')[0] ?? ''
  const name = local.split(/[._-]/)[0] ?? local
  if (!name) return 'there'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function computeRecoveryScore(health?: HomeHealthInput | null): number {
  if (!health) return 72
  let score = 70
  if (health.sleepHours != null) {
    if (health.sleepHours >= 7.5) score += 15
    else if (health.sleepHours >= 6.5) score += 8
    else if (health.sleepHours < 6) score -= 20
    else score -= 8
  }
  if (health.workoutCompleted) score += 12
  else score -= 6
  return Math.max(20, Math.min(98, Math.round(score)))
}

export function computeDailySuccessProbability(
  decision?: DecisionOutput | null,
  outcomeStats?: OutcomeStats | null,
): number {
  if (decision?.confidence) {
    const historical = outcomeStats?.successRate ?? 0
    if (historical > 0) {
      return Math.round((decision.confidence * 0.6) + (historical * 0.4))
    }
    return decision.confidence
  }
  return outcomeStats?.successRate ?? 68
}

export interface HomeNarrativeInput {
  health?: HomeHealthInput | null
  coordinator?: DomainCoordinatorOutput | null
  decision?: DecisionOutput | null
  morningPlan?: MorningExecutionPlan | null
  dailyContext?: DailyContext | null
  outcomeStats?: OutcomeStats | null
}

export function generateHomeNarrative(input: HomeNarrativeInput): string {
  const paragraphs: string[] = []
  const sleep = input.health?.sleepHours
  const recovery = computeRecoveryScore(input.health)

  if (sleep != null && sleep >= 7) {
    paragraphs.push(`You slept well (${sleep}h) and your recovery is ${recovery >= 75 ? 'good' : 'acceptable'}.`)
  } else if (sleep != null && sleep < 6.5) {
    paragraphs.push(`Sleep was light (${sleep}h). Protect energy today and avoid overcommitting.`)
  } else {
    paragraphs.push('Start with clarity — your recovery baseline is still forming.')
  }

  const topDomain = input.coordinator?.evaluations.find(e => e.domainId === input.coordinator?.topDomain)
  const school = input.coordinator?.evaluations.find(e => e.domainId === 'school')
  const founder = input.coordinator?.evaluations.find(e => e.domainId === 'founder')

  if (school && (school.priority === 'critical' || school.priority === 'high')) {
    paragraphs.push(`School becomes more important today because ${school.risks[0]?.toLowerCase() ?? 'academic pressure is rising'}.`)
  } else if (topDomain && topDomain.domainId === 'school') {
    paragraphs.push(`School leads today — ${school?.recommendation ?? 'protect study windows.'}`)
  }

  if (founder && founder.score >= 65) {
    paragraphs.push(`FounderOS has ${founder.opportunities[0]?.toLowerCase() ?? 'momentum from recent build activity'}, but avoid expanding architecture unless it is today's highest leverage move.`)
  }

  const action = input.decision?.primaryDecision.action
    ?? input.morningPlan?.topPriorities.find(p => !p.completed)?.title
    ?? input.coordinator?.globalRecommendation

  if (action) {
    paragraphs.push(`Today's highest leverage action is ${action.endsWith('.') ? action.slice(0, -1) : action}.`)
  }

  return paragraphs.join('\n\n')
}

export function missionConfidenceLabel(decision?: DecisionOutput | null): string {
  if (!decision) return 'Forming'
  return decision.confidenceLabel === 'high' ? 'High' : decision.confidenceLabel === 'medium' ? 'Moderate' : 'Building'
}

export function missionImportanceLabel(decision?: DecisionOutput | null): string {
  if (!decision) return 'Daily focus'
  const imp = decision.primaryDecision.importance
  return imp === 'critical' || imp === 'high' ? 'Critical' : imp === 'medium' ? 'Important' : 'Steady'
}

export function missionSourceLabel(morningPlan?: MorningExecutionPlan | null): string {
  if (morningPlan?.primaryMission) return 'Your mission'
  return 'Morning plan'
}

export function domainOneLiner(evaluation: DomainEvaluation): string {
  if (evaluation.opportunities[0]) return evaluation.opportunities[0]
  if (evaluation.risks[0]) return evaluation.risks[0]
  return evaluation.recommendation.split('.')[0] ?? evaluation.recommendation
}

export const HOME_DOMAIN_IDS = [
  'founder', 'school', 'health', 'finance', 'relationships', 'systems',
] as const
