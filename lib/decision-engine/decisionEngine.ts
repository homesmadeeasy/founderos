import { isDueToday, isOverdue } from '@/lib/command-center/utils'
import {
  isActiveProjectObject,
  isFounderOSObject,
  isOpenTaskObject,
  isSchoolObject,
} from '@/lib/executive-engine/executiveUtils'
import type {
  CandidateAction,
  Decision,
  DecisionInput,
  DecisionOutput,
} from './decisionTypes'
import { buildIgnoreList, detectConflicts } from './decisionConflicts'
import { buildEvidenceForCandidate, calculateConfidence } from './decisionEvidence'
import { buildExplanation } from './decisionExplanations'
import { rankCandidates } from './decisionScoring'
import {
  newDecisionId,
  normalizeDecisionInput,
  nowISO,
  scoreToConfidenceLabel,
  textIncludesAny,
  todayISO,
  tomorrowISO,
} from './decisionUtils'

function candidateToDecision(candidate: CandidateAction, confidenceLabel: Decision['confidence']): Decision {
  return {
    id: candidate.id,
    title: candidate.title,
    action: candidate.action,
    area: candidate.area,
    urgency: candidate.urgency,
    importance: candidate.importance,
    estimatedMinutes: candidate.estimatedMinutes,
    reason: candidate.reason,
    confidence: confidenceLabel,
    relatedObjectIds: candidate.relatedObjectIds,
    relatedMemoryIds: candidate.relatedMemoryIds,
    relatedKnowledgeIds: candidate.relatedKnowledgeIds,
    relatedSignalIds: candidate.relatedSignalIds,
  }
}

function gatherCandidates(input: DecisionInput): CandidateAction[] {
  const candidates: CandidateAction[] = []
  const today = todayISO()
  const tomorrow = tomorrowISO()
  const objects = input.objects
  const memories = input.memories
  const knowledge = input.knowledge
  const signals = input.signals
  const recommendations = input.executiveState.recommendations

  for (const item of input.morningPlan?.topPriorities ?? []) {
    if (item.completed) continue
    candidates.push({
      id: `morning-${item.id}`,
      title: item.title,
      action: item.title,
      area: item.area ?? 'growth',
      urgency: item.priority === 'high' ? 'high' : 'medium',
      importance: item.priority === 'high' ? 'high' : 'medium',
      estimatedMinutes: item.estimatedMinutes,
      reason: item.reason,
      relatedObjectIds: item.relatedObjectIds,
      relatedMemoryIds: item.relatedMemoryIds,
      relatedKnowledgeIds: item.relatedKnowledgeIds,
      relatedSignalIds: [],
      tags: ['morning-priority', ...(textIncludesAny(item.title, ['study', 'economics']) ? ['study'] : []),
        ...(textIncludesAny(item.title, ['founderos']) ? ['founderos'] : [])],
    })
  }

  for (const rec of recommendations.slice(0, 4)) {
    candidates.push({
      id: `exec-${rec.id}`,
      title: rec.title,
      action: rec.title,
      area: rec.area ?? 'growth',
      urgency: rec.priority === 'high' ? 'high' : 'medium',
      importance: rec.priority === 'high' ? 'high' : 'medium',
      estimatedMinutes: 60,
      reason: rec.rationale,
      relatedObjectIds: rec.relatedObjectIds,
      relatedMemoryIds: rec.relatedMemoryIds,
      relatedKnowledgeIds: [],
      relatedSignalIds: [],
      tags: [
        'executive',
        ...(textIncludesAny(rec.title, ['founderos']) ? ['founderos', 'deep-work'] : []),
        ...(textIncludesAny(rec.title, ['study', 'school']) ? ['study'] : []),
        ...(textIncludesAny(rec.title, ['workout', 'health']) ? ['workout'] : []),
      ],
    })
  }

  for (const task of objects.filter(isOpenTaskObject).slice(0, 6)) {
    const due = task.metadata?.dueDate as string | undefined
    const overdue = due ? isOverdue(due) : false
    const dueToday = due ? isDueToday(due) : false
    const school = isSchoolObject(task)
    const founder = isFounderOSObject(task)
    candidates.push({
      id: `task-${task.id}`,
      title: task.title,
      action: `Complete: ${task.title}`,
      area: task.area ?? (school ? 'knowledge' : founder ? 'systems' : 'growth'),
      urgency: overdue ? 'critical' : dueToday ? 'high' : task.priority === 'high' ? 'high' : 'medium',
      importance: task.priority === 'high' ? 'high' : 'medium',
      estimatedMinutes: 45,
      reason: overdue ? 'Overdue — close the loop.' : dueToday ? 'Due today.' : 'Open task needs progress.',
      relatedObjectIds: [task.id],
      relatedMemoryIds: memories.filter(m => m.relatedObjectIds.includes(task.id)).slice(0, 2).map(m => m.id),
      relatedKnowledgeIds: [],
      relatedSignalIds: [],
      tags: [
        ...(overdue ? ['overdue', 'deadline'] : []),
        ...(dueToday ? ['deadline'] : []),
        ...(school ? ['study', 'exam'] : []),
        ...(founder ? ['founderos', 'deep-work'] : []),
      ],
    })
  }

  for (const project of objects.filter(isActiveProjectObject).slice(0, 4)) {
    const stalled = !objects.some(t =>
      isOpenTaskObject(t) && (
        t.relationships.some(r => r.toObjectId === project.id)
        || project.relationships.some(r => r.toObjectId === t.id)
      ),
    ) && !project.metadata?.nextAction
    if (stalled) {
      candidates.push({
        id: `blocker-${project.id}`,
        title: `Fix blocker: ${project.title}`,
        action: `Define next action for ${project.title}`,
        area: project.area ?? 'systems',
        urgency: 'high',
        importance: 'high',
        estimatedMinutes: 30,
        reason: 'Stalled project with no clear next action.',
        relatedObjectIds: [project.id],
        relatedMemoryIds: [],
        relatedKnowledgeIds: [],
        relatedSignalIds: [],
        tags: ['blocker'],
      })
    } else if (isFounderOSObject(project)) {
      candidates.push({
        id: `project-${project.id}`,
        title: `Move ${project.title} forward`,
        action: `Deep work on ${project.title}`,
        area: 'systems',
        urgency: 'medium',
        importance: 'high',
        estimatedMinutes: 90,
        reason: 'Core systems project — protect builder time.',
        relatedObjectIds: [project.id],
        relatedMemoryIds: memories.filter(m => m.relatedObjectIds.includes(project.id)).slice(0, 2).map(m => m.id),
        relatedKnowledgeIds: knowledge.filter(k => k.domain === 'founder' || k.domain === 'systems').slice(0, 2).map(k => k.id),
        relatedSignalIds: signals.filter(s => s.type === 'coding_session').slice(0, 1).map(s => s.id),
        tags: ['founderos', 'deep-work'],
      })
    }
  }

  for (const signal of signals) {
    const text = `${signal.title} ${signal.content}`.toLowerCase()
    const start = ((signal.metadata?.start as string) ?? signal.timestamp).slice(0, 10)

    if (signal.source === 'calendar' || signal.type === 'event') {
      const study = textIncludesAny(text, ['study', 'class', 'lecture', 'economics', 'exam'])
      const workout = textIncludesAny(text, ['gym', 'workout', 'train'])
      const examSoon = start === today || start === tomorrow

      if (study) {
        candidates.push({
          id: `signal-study-${signal.id}`,
          title: signal.title,
          action: `Study: ${signal.title}`,
          area: 'knowledge',
          urgency: examSoon ? 'critical' : 'high',
          importance: 'high',
          estimatedMinutes: Number(signal.metadata?.durationMinutes) || 90,
          reason: examSoon
            ? 'Calendar study block is imminent — protect focus time.'
            : 'Study block on calendar.',
          relatedObjectIds: signal.relatedObjectIds,
          relatedMemoryIds: signal.relatedMemoryIds,
          relatedKnowledgeIds: knowledge.filter(k => k.domain === 'school').slice(0, 1).map(k => k.id),
          relatedSignalIds: [signal.id],
          tags: ['calendar', 'study', ...(examSoon ? ['exam', 'deadline'] : [])],
        })
      }

      if (workout) {
        candidates.push({
          id: `signal-workout-${signal.id}`,
          title: signal.title,
          action: `Train: ${signal.title}`,
          area: 'health',
          urgency: start === today ? 'high' : 'medium',
          importance: 'medium',
          estimatedMinutes: 60,
          reason: 'Workout scheduled on calendar.',
          relatedObjectIds: [],
          relatedMemoryIds: [],
          relatedKnowledgeIds: [],
          relatedSignalIds: [signal.id],
          tags: ['calendar', 'workout'],
        })
      }
    }

    if (signal.type === 'coding_session') {
      candidates.push({
        id: `signal-coding-${signal.id}`,
        title: 'Continue FounderOS build',
        action: 'Ship the next FounderOS milestone',
        area: 'systems',
        urgency: 'medium',
        importance: 'high',
        estimatedMinutes: 90,
        reason: `Coding momentum detected: ${signal.title}`,
        relatedObjectIds: signal.relatedObjectIds,
        relatedMemoryIds: signal.relatedMemoryIds,
        relatedKnowledgeIds: [],
        relatedSignalIds: [signal.id],
        tags: ['founderos', 'deep-work'],
      })
    }

    if (text.includes('workout not logged') || signal.metadata?.workoutLogged === false) {
      candidates.push({
        id: `signal-workout-gap-${signal.id}`,
        title: 'Complete workout',
        action: 'Log or complete today\'s workout',
        area: 'health',
        urgency: 'high',
        importance: 'medium',
        estimatedMinutes: 45,
        reason: signal.content,
        relatedObjectIds: [],
        relatedMemoryIds: [],
        relatedKnowledgeIds: [],
        relatedSignalIds: [signal.id],
        tags: ['workout', 'health-risk'],
      })
    }
  }

  const sleep = input.executiveState.healthSignals?.sleepHours
  if (sleep != null && sleep < 6.5) {
    candidates.push({
      id: 'recovery-low-sleep',
      title: 'Rest and recover',
      action: 'Take a recovery-first morning — light work only',
      area: 'recovery',
      urgency: 'high',
      importance: 'high',
      estimatedMinutes: 30,
      reason: `Low sleep (${sleep}h) — reduce intensity.`,
      relatedObjectIds: [],
      relatedMemoryIds: memories.filter(m => m.type === 'health_log').slice(0, 1).map(m => m.id),
      relatedKnowledgeIds: knowledge.filter(k => k.title.toLowerCase().includes('health')).slice(0, 1).map(k => k.id),
      relatedSignalIds: [],
      tags: ['recovery', 'health-risk'],
    })
  }

  if ((input.unresolvedCaptureCount ?? 0) >= 5) {
    candidates.push({
      id: 'inbox-process',
      title: 'Process inbox captures',
      action: `Triage ${input.unresolvedCaptureCount} unprocessed captures`,
      area: 'inbox',
      urgency: (input.unresolvedCaptureCount ?? 0) >= 8 ? 'high' : 'medium',
      importance: 'medium',
      estimatedMinutes: 30,
      reason: 'Capture pile is creating noise — clear inbox before deep work.',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedKnowledgeIds: knowledge.filter(k => k.principle.toLowerCase().includes('capture')).slice(0, 1).map(k => k.id),
      relatedSignalIds: [],
      tags: ['inbox'],
    })
  }

  for (const k of knowledge.filter(k => k.confidence === 'high').slice(0, 2)) {
    if (candidates.some(c => c.relatedKnowledgeIds.includes(k.id))) continue
    candidates.push({
      id: `knowledge-${k.id}`,
      title: `Apply: ${k.title}`,
      action: k.principle.slice(0, 80),
      area: k.domain === 'founder' ? 'systems' : 'growth',
      urgency: 'low',
      importance: 'medium',
      estimatedMinutes: 20,
      reason: `Principle: ${k.principle}`,
      relatedObjectIds: k.relatedObjectIds,
      relatedMemoryIds: [],
      relatedKnowledgeIds: [k.id],
      relatedSignalIds: [],
      tags: ['knowledge'],
    })
  }

  const incompletePriorities = input.eveningReview?.incompletePriorities ?? []
  if (incompletePriorities.length > 0) {
    for (const title of incompletePriorities.slice(0, 2)) {
      if (candidates.some(c => c.title.toLowerCase() === title.toLowerCase())) continue
      candidates.push({
        id: `evening-${title.slice(0, 20)}`,
        title,
        action: title,
        area: 'growth',
        urgency: 'high',
        importance: 'high',
        estimatedMinutes: 60,
        reason: 'Incomplete from last evening review — carry forward.',
        relatedObjectIds: [],
        relatedMemoryIds: [],
        relatedKnowledgeIds: [],
        relatedSignalIds: [],
        tags: ['evening-carry'],
      })
    }
  }

  const seen = new Set<string>()
  return candidates.filter(c => {
    const key = c.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildInsufficientDataOutput(input: DecisionInput): DecisionOutput {
  const primaryDecision: Decision = {
    id: 'fallback-review-plan',
    title: "Review today's plan",
    action: "Review today's plan",
    area: 'planning',
    urgency: 'medium',
    importance: 'medium',
    estimatedMinutes: 15,
    reason: 'Not enough data loaded yet — review your morning plan and pick one priority.',
    confidence: 'low',
    relatedObjectIds: [],
    relatedMemoryIds: [],
    relatedKnowledgeIds: [],
    relatedSignalIds: [],
  }

  return {
    id: newDecisionId(),
    createdAt: input.currentTime,
    primaryDecision,
    secondaryDecisions: [],
    ignoreToday: [],
    risks: [],
    opportunities: [],
    confidence: 25,
    confidenceLabel: 'low',
    evidence: [],
    tradeoffs: [],
    explanation: 'I recommend **Review today\'s plan** because not enough data is loaded yet. Open **/morning** and confirm your priorities. Confidence: 25%.',
  }
}

export function decide(input: DecisionInput): DecisionOutput {
  const safe = normalizeDecisionInput(input)
  const candidates = gatherCandidates(safe)

  if (candidates.length === 0) {
    return buildInsufficientDataOutput(safe)
  }

  const ranked = rankCandidates(candidates, safe)
  const topScored = ranked[0]
  const primaryCandidate = topScored?.candidate ?? {
    id: 'fallback-plan',
    title: "Review today's plan",
    action: "Review today's plan",
    area: 'planning' as const,
    urgency: 'medium' as const,
    importance: 'medium' as const,
    estimatedMinutes: 15,
    reason: 'Not enough structured evidence — review your morning plan first.',
    relatedObjectIds: [],
    relatedMemoryIds: [],
    relatedKnowledgeIds: [],
    relatedSignalIds: [],
    tags: [],
  }

  const evidence = buildEvidenceForCandidate(primaryCandidate, safe)
  const { risks, tradeoffs } = detectConflicts(ranked.map(r => r.candidate), safe)
  const confidence = calculateConfidence(evidence, tradeoffs.length)
  const confidenceLabel = scoreToConfidenceLabel(confidence)
  const ignoreToday = buildIgnoreList(ranked.map(r => r.candidate), primaryCandidate, safe)

  const opportunities = safe.reasoningOutput?.secondaryFocuses?.slice(0, 3)
    ?? safe.executiveState.recommendations.slice(1, 4).map(r => r.title)

  const primaryDecision = candidateToDecision(primaryCandidate, confidenceLabel)
  const secondaryDecisions = ranked.slice(1, 4).map(r =>
    candidateToDecision(r.candidate, scoreToConfidenceLabel(r.breakdown.total)),
  )

  const partial: Omit<DecisionOutput, 'explanation'> = {
    id: newDecisionId(),
    createdAt: safe.currentTime,
    primaryDecision,
    secondaryDecisions,
    ignoreToday,
    risks,
    opportunities,
    confidence,
    confidenceLabel,
    evidence,
    tradeoffs,
  }

  return {
    ...partial,
    explanation: buildExplanation(partial),
  }
}

export function buildDecisionInputFromMorningState(params: {
  objects?: DecisionInput['objects']
  memories?: DecisionInput['memories']
  knowledge?: DecisionInput['knowledge']
  signals?: DecisionInput['signals']
  morningPlan?: DecisionInput['morningPlan']
  eveningReview?: DecisionInput['eveningReview']
  executiveState?: DecisionInput['executiveState']
  reasoningOutput?: DecisionInput['reasoningOutput']
  unresolvedCaptureCount?: number
}): DecisionInput {
  return normalizeDecisionInput({
    objects: params.objects ?? [],
    memories: params.memories ?? [],
    knowledge: params.knowledge ?? [],
    signals: params.signals ?? [],
    morningPlan: params.morningPlan ?? null,
    eveningReview: params.eveningReview ?? null,
    executiveState: params.executiveState ?? { recommendations: [], warnings: [], tradeoffs: [] },
    reasoningOutput: params.reasoningOutput ?? null,
    unresolvedCaptureCount: params.unresolvedCaptureCount ?? 0,
    currentTime: nowISO(),
  })
}
