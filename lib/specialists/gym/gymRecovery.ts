import type { RecoveryStatus } from './gymTypes'
import type { GymInput } from './gymTypes'
import type { WorkoutSession } from './gymTypes'
import { gatherGymData } from './gymUtils'
import { totalWeeklySets } from './gymVolume'

export interface RecoveryAssessment {
  status: RecoveryStatus
  score: number
  rationale: string
  factors: string[]
}

export function assessRecovery(
  input: GymInput,
  sessions: WorkoutSession[],
): RecoveryAssessment {
  const health = input.healthSignals ?? input.dailyContext?.healthSignals ?? null
  const data = gatherGymData(input)
  const factors: string[] = []
  let score = 72

  const sleep = health?.sleepHours
  if (sleep != null) {
    if (sleep < 6) {
      score -= 28
      factors.push(`Low sleep (${sleep}h)`)
    } else if (sleep < 6.5) {
      score -= 14
      factors.push(`Borderline sleep (${sleep}h)`)
    } else if (sleep >= 7.5) {
      score += 10
      factors.push(`Solid sleep (${sleep}h)`)
    }
  } else {
    const sleepSignal = data.healthSignals.find(s => /sleep/i.test(s.title))
    if (sleepSignal && /low|below|6\./i.test(sleepSignal.content)) {
      score -= 12
      factors.push(sleepSignal.title)
    }
  }

  const weekSessions = sessions.filter(s => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return s.date >= weekAgo.toISOString()
  }).length

  if (weekSessions >= 5) {
    score -= 15
    factors.push(`${weekSessions} sessions in 7 days — high frequency`)
  } else if (weekSessions >= 4) {
    score -= 6
    factors.push(`${weekSessions} sessions this week`)
  }

  const todayCompleted = health?.workoutCompleted
    || data.healthLogs.some(m =>
      m.occurredAt.slice(0, 10) === new Date().toISOString().slice(0, 10)
      && /workout completed/i.test(m.content),
    )
  if (todayCompleted) {
    score -= 10
    factors.push('Workout already logged today')
  }

  const eveningEnergy = input.eveningReview?.outcomeEnergyAfter ?? input.eveningReview?.energyLevel
  if (eveningEnergy === 'low') {
    score -= 8
    factors.push('Yesterday ended with low energy')
  }

  const healthEval = input.domainIntelligence?.evaluations.find(e => e.domainId === 'health')
  if (healthEval?.status === 'at_risk') {
    score -= 12
    factors.push('Health domain at risk')
  }

  const poorOutcomes = data.memories.length === 0 && weekSessions === 0
    ? 0
    : (input.outcomes ?? []).filter(o =>
      o.record?.outcomeQuality === 'poor'
      && (o.prediction?.decisionArea === 'health'
        || /health|workout|train|gym/i.test(o.prediction?.decisionTitle ?? '')),
    ).length
  if (poorOutcomes > 0) {
    score -= 8
    factors.push('Recent training decisions underperformed')
  }

  score = Math.max(15, Math.min(98, score))

  let status: RecoveryStatus = 'ready'
  if (score < 40) status = 'deload'
  else if (score < 55) status = 'recover'
  else if (score < 70) status = 'train_light'

  const rationale = factors.length > 0
    ? factors.join(' · ')
    : 'No strong recovery constraints detected from available signals.'

  return { status, score, rationale, factors }
}

export function recoveryScoreFromAssessment(assessment: RecoveryAssessment): number {
  return assessment.score
}
