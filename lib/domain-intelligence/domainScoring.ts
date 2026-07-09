import type { DomainEvaluationInput, DomainId } from './domainTypes'
import type { FilteredDomainData } from './domainEvidence'
import { todayISO, tomorrowISO, textIncludesAny, clamp } from './domainUtils'

export interface DomainScoreResult {
  score: number
  hasData: boolean
  hasUrgentSignals: boolean
  risks: string[]
  opportunities: string[]
  recommendation: string
  nextAction: string
}

export function scoreDomain(
  domainId: DomainId,
  data: FilteredDomainData,
  input: DomainEvaluationInput,
): DomainScoreResult {
  switch (domainId) {
    case 'founder': return scoreFounder(data, input)
    case 'school': return scoreSchool(data, input)
    case 'health': return scoreHealth(data, input)
    case 'finance': return scoreFinance(data, input)
    case 'relationships': return scoreRelationships(data, input)
    case 'personal_growth': return scorePersonalGrowth(data, input)
    case 'systems': return scoreSystems(data, input)
    default: return emptyScore()
  }
}

function emptyScore(): DomainScoreResult {
  return {
    score: 50,
    hasData: false,
    hasUrgentSignals: false,
    risks: [],
    opportunities: [],
    recommendation: 'Not enough data to evaluate this domain yet.',
    nextAction: 'Add objects, signals, or memories tagged for this area.',
  }
}

function scoreFounder(data: FilteredDomainData, input: DomainEvaluationInput): DomainScoreResult {
  const hasData = data.objects.length > 0 || data.signals.some(s => s.type === 'coding_session') || data.planItems.length > 0
  let score = 55
  const risks: string[] = []
  const opportunities: string[] = []

  const codingSignals = data.signals.filter(s => s.type === 'coding_session')
  const activeTasks = data.objects.filter(o => o.type === 'task' && o.status !== 'completed')
  const incompletePlan = data.planItems.filter(p => !p.completed)

  if (codingSignals.length > 0) {
    score += 15
    opportunities.push('Coding momentum detected — good window for deep work.')
  }
  if (activeTasks.length > 0) {
    score += 10
    opportunities.push(`${activeTasks.length} active FounderOS task(s) ready.`)
  }
  if (incompletePlan.length > 0) {
    score += 8
    opportunities.push(`Morning plan includes ${incompletePlan.length} FounderOS priority item(s).`)
  }

  const poorOutcomes = data.outcomes.filter(o => o.record?.outcomeQuality === 'poor')
  if (poorOutcomes.length >= 2) {
    score -= 15
    risks.push('Recent FounderOS decisions produced poor outcomes.')
  }

  const sleep = input.healthSignals?.sleepHours
  if (sleep != null && sleep < 6.5) {
    score -= 12
    risks.push('Low sleep — avoid overcommitting to deep work today.')
  }

  const hasStudyUrgent = input.signals.some(s => {
    const text = `${s.title} ${s.content}`.toLowerCase()
    const start = ((s.metadata?.start as string) ?? s.timestamp).slice(0, 10)
    return (start === todayISO() || start === tomorrowISO())
      && textIncludesAny(text, ['study', 'exam', 'assignment', 'class'])
  })
  if (hasStudyUrgent) {
    score -= 10
    risks.push('School pressure today — FounderOS should not crowd out academics.')
  }

  return {
    score: clamp(score),
    hasData,
    hasUrgentSignals: hasStudyUrgent,
    risks,
    opportunities,
    recommendation: score >= 65
      ? 'Founder momentum is strong — schedule focused build time after school/health are stable.'
      : 'Protect school and health before pushing FounderOS deep work.',
    nextAction: incompletePlan[0]?.title
      ?? activeTasks[0]?.title
      ?? (codingSignals.length ? 'Continue coding session momentum' : 'Define next FounderOS build block'),
  }
}

function scoreSchool(data: FilteredDomainData, input: DomainEvaluationInput): DomainScoreResult {
  const today = todayISO()
  const tomorrow = tomorrowISO()
  const studySignals = data.signals.filter(s => {
    const text = `${s.title} ${s.content}`.toLowerCase()
    const start = ((s.metadata?.start as string) ?? s.timestamp).slice(0, 10)
    return textIncludesAny(text, ['study', 'exam', 'assignment', 'economics', 'class'])
      && (start === today || start === tomorrow)
  })
  const hasData = data.objects.length > 0 || studySignals.length > 0 || data.planItems.length > 0
  let score = 60
  const risks: string[] = []
  const opportunities: string[] = []

  if (studySignals.length > 0) {
    score += 20
    risks.push(`${studySignals.length} study deadline(s) today or tomorrow.`)
  }
  const overdueTasks = data.objects.filter(o =>
    o.type === 'task' && o.status !== 'completed' && textIncludesAny(objectText(o), ['overdue', 'exam', 'assignment']),
  )
  if (overdueTasks.length > 0) {
    score -= 15
    risks.push(`${overdueTasks.length} overdue or urgent school task(s).`)
  }
  const incomplete = data.planItems.filter(p => !p.completed)
  if (incomplete.length > 0) {
    score += 5
    opportunities.push(`${incomplete.length} study priority item(s) on morning plan.`)
  }

  const goodOutcomes = data.outcomes.filter(o =>
    o.record && (o.record.outcomeQuality === 'good' || o.record.outcomeQuality === 'excellent'),
  )
  if (goodOutcomes.length >= 2) {
    score += 8
    opportunities.push('Study-first decisions have worked recently.')
  }

  const hasUrgent = studySignals.length > 0 || overdueTasks.length > 0

  return {
    score: clamp(score),
    hasData,
    hasUrgentSignals: hasUrgent,
    risks,
    opportunities,
    recommendation: hasUrgent
      ? 'School is time-sensitive today — protect study blocks first.'
      : 'School is stable — maintain steady progress without crowding other domains.',
    nextAction: incomplete[0]?.title
      ?? studySignals[0]?.title
      ?? overdueTasks[0]?.title
      ?? 'Review study plan for the week',
  }
}

function objectText(o: { title: string; summary?: string; content?: string }): string {
  return `${o.title} ${o.summary ?? ''} ${o.content ?? ''}`
}

function scoreHealth(data: FilteredDomainData, input: DomainEvaluationInput): DomainScoreResult {
  const health = input.healthSignals
  const hasData = health != null || data.signals.length > 0 || data.memories.length > 0
  let score = 65
  const risks: string[] = []
  const opportunities: string[] = []

  const sleep = health?.sleepHours
  if (sleep != null) {
    if (sleep < 6) {
      score -= 25
      risks.push(`Low sleep (${sleep}h) — recovery should take priority.`)
    } else if (sleep < 6.5) {
      score -= 12
      risks.push(`Borderline sleep (${sleep}h).`)
    } else if (sleep >= 7.5) {
      score += 10
      opportunities.push('Sleep is solid — energy available for training or deep work.')
    }
  }

  if (health && !health.workoutCompleted) {
    score -= 10
    risks.push('Workout not logged today.')
  } else if (health?.workoutCompleted) {
    score += 12
    opportunities.push('Workout completed — maintain recovery habits.')
  }

  const eveningEnergy = input.eveningReview?.outcomeEnergyAfter ?? input.eveningReview?.energyLevel
  if (eveningEnergy === 'low') {
    score -= 8
    risks.push('Yesterday ended with low energy.')
  }

  const poorHealthOutcomes = data.outcomes.filter(o => o.record?.outcomeQuality === 'poor')
  if (poorHealthOutcomes.length > 0) {
    score -= 10
    risks.push('Health-related decisions recently underperformed.')
  }

  const hasUrgent = (sleep != null && sleep < 6.5)
    || Boolean(health && !health.workoutCompleted && score < 50)

  return {
    score: clamp(score),
    hasData,
    hasUrgentSignals: hasUrgent,
    risks,
    opportunities,
    recommendation: hasUrgent
      ? 'Health is at risk — reduce load and prioritise recovery or training.'
      : 'Health baseline is acceptable — maintain workout and sleep habits.',
    nextAction: sleep != null && sleep < 6.5
      ? 'Prioritise recovery and lighter cognitive load'
      : health && !health.workoutCompleted
        ? 'Log or complete today\'s workout'
        : 'Maintain sleep and nutrition baseline',
  }
}

function scoreFinance(data: FilteredDomainData, input: DomainEvaluationInput): DomainScoreResult {
  const hasData = data.objects.length > 0 || data.knowledge.length > 0 || data.memories.length > 0
  let score = 55
  const risks: string[] = []
  const opportunities: string[] = []

  const openTasks = data.objects.filter(o => o.type === 'task' && o.status !== 'completed')
  if (openTasks.length > 0) {
    score += 10
    opportunities.push(`${openTasks.length} finance/career task(s) open.`)
  }
  if (!hasData) {
    return { ...emptyScore(), score: 45, hasData: false }
  }

  return {
    score: clamp(score),
    hasData,
    hasUrgentSignals: false,
    risks,
    opportunities,
    recommendation: 'Finance domain is steady — address career/money tasks when higher domains are stable.',
    nextAction: openTasks[0]?.title ?? 'Review financial goals and next action',
  }
}

function scoreRelationships(data: FilteredDomainData, input: DomainEvaluationInput): DomainScoreResult {
  const hasData = data.objects.length > 0 || data.memories.length > 0
  let score = 60
  if (!hasData) {
    return { ...emptyScore(), score: 50, hasData: false, recommendation: 'No relationship signals captured recently.' }
  }
  const people = data.objects.filter(o => o.type === 'person' || o.type === 'conversation')
  return {
    score: clamp(score + people.length * 5),
    hasData,
    hasUrgentSignals: false,
    risks: [],
    opportunities: people.length ? ['Relationship objects tracked — maintain communication rhythm.'] : [],
    recommendation: 'Protect important relationships with brief, consistent touchpoints.',
    nextAction: people[0]?.title ?? 'Send a check-in message',
  }
}

function scorePersonalGrowth(data: FilteredDomainData, input: DomainEvaluationInput): DomainScoreResult {
  const hasData = data.memories.length > 0 || data.knowledge.length > 0 || data.planItems.length > 0
  let score = 58
  const reflections = data.memories.filter(m => m.type === 'reflection' || m.type === 'learning')
  const lessons = data.outcomes.filter(o => o.record?.lessons)
  if (reflections.length > 0) score += 10
  if (lessons.length > 0) score += 8
  const incomplete = data.planItems.filter(p => !p.completed && textIncludesAny(p.title, ['read', 'journal', 'habit']))
  if (incomplete.length > 0) score += 6

  return {
    score: clamp(score),
    hasData,
    hasUrgentSignals: false,
    risks: hasData ? [] : ['Limited reflection or learning data.'],
    opportunities: lessons.length ? ['Recent lessons captured from outcomes.'] : ['Evening review is a good reflection anchor.'],
    recommendation: 'Compound growth through reading, reflection, and captured lessons.',
    nextAction: incomplete[0]?.title ?? reflections[0]?.title ?? 'Log one reflection or lesson today',
  }
}

function scoreSystems(data: FilteredDomainData, input: DomainEvaluationInput): DomainScoreResult {
  const captureCount = input.unresolvedCaptureCount ?? 0
  const hasData = captureCount > 0 || data.memories.length > 0 || data.planItems.length > 0
  let score = 70
  const risks: string[] = []
  const opportunities: string[] = []

  if (captureCount >= 8) {
    score -= 25
    risks.push(`Large capture backlog (${captureCount} inbox items).`)
  } else if (captureCount >= 5) {
    score -= 15
    risks.push(`Capture pile growing (${captureCount} inbox items).`)
  } else if (captureCount === 0) {
    score += 10
    opportunities.push('Inbox is clear.')
  }

  if (input.eveningReview && !input.eveningReview.completed) {
    score -= 8
    risks.push('Evening review not completed — daily loop is open.')
  }
  if (input.morningPlan?.completed) {
    score += 8
    opportunities.push('Morning plan marked complete — system is running.')
  }

  const hasUrgent = captureCount >= 5

  return {
    score: clamp(score),
    hasData: true,
    hasUrgentSignals: hasUrgent,
    risks,
    opportunities,
    recommendation: hasUrgent
      ? 'Clear inbox and close open loops before adding more ideas.'
      : 'Systems are healthy — maintain review rhythm.',
    nextAction: captureCount >= 5
      ? `Process ${captureCount} inbox captures`
      : input.eveningReview && !input.eveningReview.completed
        ? 'Complete evening review'
        : 'Run quick inbox triage',
  }
}
