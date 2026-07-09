import {
  isActiveProjectObject,
  isFounderOSObject,
} from '@/lib/executive-engine/executiveUtils'
import type {
  CandidateAction,
  DecisionInput,
  ScoreBreakdown,
} from './decisionTypes'
import { clamp, importanceToScore, textIncludesAny, todayISO, tomorrowISO, urgencyToScore } from './decisionUtils'
import { applyOutcomeFeedbackToCandidate } from '@/lib/outcome-engine/outcomeScoring'
import { getSimilarPastOutcomes } from '@/lib/outcome-engine/outcomeEngine'

export interface ScoredCandidate {
  candidate: CandidateAction
  breakdown: ScoreBreakdown
}

function hasStudyPressure(input: DecisionInput): boolean {
  const tomorrow = tomorrowISO()
  const today = todayISO()
  const signals = input.signals ?? []
  return signals.some(s => {
    const text = `${s.title} ${s.content}`.toLowerCase()
    const start = ((s.metadata?.start as string) ?? s.timestamp).slice(0, 10)
    const isStudy = text.includes('study') || text.includes('exam') || text.includes('assignment')
      || text.includes('economics') || text.includes('class')
    return isStudy && (start === today || start === tomorrow)
  })
}

function hasFounderOSMomentum(input: DecisionInput): boolean {
  const objects = input.objects ?? []
  const memories = input.memories ?? []
  const signals = input.signals ?? []
  const founderProject = objects.find(o => isActiveProjectObject(o) && isFounderOSObject(o))
  if (!founderProject) return false
  return memories.some(m =>
    m.relatedObjectIds.includes(founderProject.id)
    && (m.type === 'project_update' || m.type === 'learning'),
  ) || signals.some(s => s.type === 'coding_session')
}

function hasWorkoutGap(input: DecisionInput): boolean {
  const signals = input.signals ?? []
  const health = input.executiveState?.healthSignals
  if (health && !health.workoutCompleted) return true
  return signals.some(s =>
    s.content.toLowerCase().includes('workout not logged')
    || s.metadata?.workoutLogged === false,
  )
}

function hasLowSleep(input: DecisionInput): boolean {
  const sleep = input.executiveState?.healthSignals?.sleepHours
  return sleep != null && sleep < 6.5
}

function hasCapturePile(input: DecisionInput): boolean {
  return (input.unresolvedCaptureCount ?? 0) >= 5
}

function hasCalendarBlockToday(input: DecisionInput): boolean {
  const today = todayISO()
  const signals = input.signals ?? []
  return signals.some(s => {
    if (s.source !== 'calendar' && s.type !== 'event') return false
    const start = ((s.metadata?.start as string) ?? s.timestamp).slice(0, 10)
    return start === today
  })
}

export function scoreCandidate(candidate: CandidateAction, input: DecisionInput): ScoreBreakdown {
  const importance = importanceToScore(candidate.importance)
  const urgency = urgencyToScore(candidate.urgency)

  let strategicAlignment = 40
  if (candidate.area === 'systems' || textIncludesAny(candidate.title, ['founderos', 'ascendos'])) {
    strategicAlignment = hasStudyPressure(input) ? 45 : 85
  }
  if (candidate.area === 'knowledge' || textIncludesAny(candidate.title, ['study', 'economics', 'exam'])) {
    strategicAlignment = hasStudyPressure(input) ? 90 : 60
  }
  if (candidate.area === 'health') strategicAlignment = 70
  if (candidate.area === 'inbox') strategicAlignment = hasCapturePile(input) ? 80 : 35

  let timeSensitivity = 30
  if (hasCalendarBlockToday(input) && candidate.tags.includes('calendar')) timeSensitivity = 85
  if (candidate.tags.includes('deadline')) timeSensitivity = 90
  if (candidate.tags.includes('exam')) timeSensitivity = 95

  let riskReduction = 30
  if (candidate.tags.includes('blocker')) riskReduction = 80
  if (candidate.tags.includes('overdue')) riskReduction = 85
  if (candidate.tags.includes('health-risk')) riskReduction = 75

  let momentum = 30
  if (candidate.tags.includes('founderos') && hasFounderOSMomentum(input)) momentum = 80
  if (candidate.tags.includes('morning-priority')) momentum = 65

  let healthImpact = 20
  if (candidate.area === 'health' || candidate.tags.includes('workout')) {
    healthImpact = hasWorkoutGap(input) ? 75 : 45
  }
  if (candidate.tags.includes('recovery')) {
    healthImpact = hasLowSleep(input) ? 90 : 40
  }

  let deadlinePressure = 20
  if (candidate.tags.includes('deadline') || candidate.tags.includes('exam')) {
    deadlinePressure = hasStudyPressure(input) ? 90 : 50
  }

  let overloadPenalty = 0
  const highPriorityCount = input.morningPlan?.topPriorities?.filter(p => p.priority === 'high').length ?? 0
  if (highPriorityCount >= 3 && candidate.importance !== 'critical') overloadPenalty = 15

  let conflictPenalty = 0
  if (candidate.tags.includes('founderos') && hasStudyPressure(input)) conflictPenalty = 20
  if (candidate.tags.includes('workout') && hasLowSleep(input)) conflictPenalty = 25
  if (candidate.tags.includes('deep-work') && hasCalendarBlockToday(input)) conflictPenalty = 15

  let lowConfidencePenalty = 0
  if (candidate.relatedObjectIds.length === 0 && candidate.relatedSignalIds.length === 0) {
    lowConfidencePenalty = 10
  }

  const similar = getSimilarPastOutcomes(candidate.title, candidate.area, 6)
  const feedback = applyOutcomeFeedbackToCandidate(candidate, similar)

  const total = clamp(
    importance * 0.15
    + urgency * 0.2
    + strategicAlignment * 0.15
    + timeSensitivity * 0.12
    + riskReduction * 0.1
    + momentum * 0.08
    + healthImpact * 0.08
    + deadlinePressure * 0.12
    - overloadPenalty
    - conflictPenalty
    - lowConfidencePenalty
    - feedback.urgencyPenalty
    + feedback.scoreBonus,
  )

  return {
    importance,
    urgency,
    strategicAlignment,
    timeSensitivity,
    riskReduction,
    momentum,
    healthImpact,
    deadlinePressure,
    overloadPenalty,
    conflictPenalty,
    lowConfidencePenalty,
    total,
  }
}

export function rankCandidates(candidates: CandidateAction[], input: DecisionInput): ScoredCandidate[] {
  return candidates
    .map(candidate => ({ candidate, breakdown: scoreCandidate(candidate, input) }))
    .sort((a, b) => b.breakdown.total - a.breakdown.total)
}
