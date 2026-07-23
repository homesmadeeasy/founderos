/**
 * Observation → candidate facts.
 * Domain-agnostic: consumes ObservationSignal only (no Gym/Founder imports).
 */

import type { IdentityEvidence, IdentityFact, ObservationSignal } from './identityTypes'
import { calculateObservationConfidence, daysBetween } from './identityConfidence'
import { averageEvidenceWeight, createEvidence, newestEvidenceAt } from './identityEvidence'
import { displayValueFromUnknown, newIdentityId, nowISO } from './identityUtils'

export interface InferenceCandidate {
  category: IdentityFact['category']
  key: string
  label: string
  value: IdentityFact['value']
  displayValue: string
  evidence: IdentityEvidence[]
  relevanceTags: string[]
  minSignals: number
}

export interface InferenceResult {
  candidates: InferenceCandidate[]
  skipped: { reason: string; signalType?: string }[]
}

const MIN_TIME_BUCKET = 5
const MIN_WEEKDAY = 4
const MIN_SKIP_STREAK = 8
const MIN_SLEEP_PERF = 5

/**
 * Run deterministic inference over arbitrary observation signals.
 * Returns candidates only when evidence thresholds are met.
 */
export function inferIdentityCandidates(signals: ObservationSignal[]): InferenceResult {
  const skipped: InferenceResult['skipped'] = []
  const candidates: InferenceCandidate[] = []

  const timed = signals.filter(s =>
    s.signalType === 'session_completed'
    || s.signalType === 'event_completed'
    || s.signalType === 'activity_logged',
  )
  const timeBucket = preferredTimeBucket(timed)
  if (timeBucket) {
    candidates.push(timeBucket)
  } else if (timed.length > 0 && timed.length < MIN_TIME_BUCKET) {
    skipped.push({ reason: 'Insufficient timed sessions for preferred time inference', signalType: 'session_completed' })
  }

  const weekday = mostConsistentWeekday(timed)
  if (weekday) candidates.push(weekday)
  else if (timed.length > 0 && timed.length < MIN_WEEKDAY) {
    skipped.push({ reason: 'Insufficient samples for weekday consistency', signalType: 'session_completed' })
  }

  const skips = signals.filter(s => s.signalType === 'activity_skipped')
  const avoid = avoidedActivity(skips)
  if (avoid) candidates.push(avoid)
  else if (skips.length > 0 && skips.length < MIN_SKIP_STREAK) {
    skipped.push({ reason: 'Skip streak below evidence threshold', signalType: 'activity_skipped' })
  }

  const sleepPerf = sleepPerformanceLink(signals)
  if (sleepPerf) candidates.push(sleepPerf)
  else {
    const paired = signals.filter(s => s.signalType === 'performance_with_sleep')
    if (paired.length > 0 && paired.length < MIN_SLEEP_PERF) {
      skipped.push({ reason: 'Insufficient sleep–performance pairs', signalType: 'performance_with_sleep' })
    }
  }

  return { candidates, skipped }
}

function preferredTimeBucket(signals: ObservationSignal[]): InferenceCandidate | null {
  if (signals.length < MIN_TIME_BUCKET) return null
  const buckets: Record<string, ObservationSignal[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  }
  for (const s of signals) {
    const hour = hourFromSignal(s)
    if (hour == null) continue
    if (hour >= 5 && hour < 12) buckets.morning.push(s)
    else if (hour >= 12 && hour < 17) buckets.afternoon.push(s)
    else if (hour >= 17 && hour < 21) buckets.evening.push(s)
    else buckets.night.push(s)
  }
  const ranked = Object.entries(buckets).sort((a, b) => b[1].length - a[1].length)
  const [label, list] = ranked[0]
  if (!list || list.length < MIN_TIME_BUCKET) return null
  const share = list.length / signals.length
  if (share < 0.55) return null

  const evidence = list.slice(0, 30).map(s => createEvidence({
    summary: `Logged activity at ${formatHour(hourFromSignal(s) ?? 0)}`,
    source: {
      kind: sourceKindFromDomain(s.domain),
      label: s.domain,
      detail: s.signalType,
    },
    observedAt: s.occurredAt,
    weight: 0.8,
    metadata: { signalId: s.id, domain: s.domain },
  }))

  return {
    category: 'preferences',
    key: 'preferred_time_of_day',
    label: 'Preferred time of day',
    value: label,
    displayValue: capitalize(label),
    evidence,
    relevanceTags: ['lifestyle', 'scheduling', ...list.map(s => s.domain).filter((v, i, a) => a.indexOf(v) === i)],
    minSignals: MIN_TIME_BUCKET,
  }
}

function mostConsistentWeekday(signals: ObservationSignal[]): InferenceCandidate | null {
  if (signals.length < MIN_WEEKDAY) return null
  const byDay: Record<string, ObservationSignal[]> = {}
  for (const s of signals) {
    const day = weekdayName(s.occurredAt)
    if (!day) continue
    byDay[day] = byDay[day] ?? []
    byDay[day].push(s)
  }
  const ranked = Object.entries(byDay).sort((a, b) => b[1].length - a[1].length)
  const [day, list] = ranked[0] ?? []
  if (!list || list.length < MIN_WEEKDAY) return null
  const share = list.length / signals.length
  if (share < 0.4) return null

  const evidence = list.slice(0, 20).map(s => createEvidence({
    summary: `Completed activity on ${day}`,
    source: { kind: sourceKindFromDomain(s.domain), label: s.domain },
    observedAt: s.occurredAt,
    weight: 0.75,
  }))

  return {
    category: 'lifestyle',
    key: 'most_consistent_weekday',
    label: 'Most consistent weekday',
    value: day,
    displayValue: day,
    evidence,
    relevanceTags: ['habits', 'scheduling'],
    minSignals: MIN_WEEKDAY,
  }
}

function avoidedActivity(skips: ObservationSignal[]): InferenceCandidate | null {
  if (skips.length < MIN_SKIP_STREAK) return null
  const byActivity: Record<string, ObservationSignal[]> = {}
  for (const s of skips) {
    const activity = String(s.payload.activity ?? s.payload.activityType ?? '').trim().toLowerCase()
    if (!activity) continue
    byActivity[activity] = byActivity[activity] ?? []
    byActivity[activity].push(s)
  }
  const ranked = Object.entries(byActivity).sort((a, b) => b[1].length - a[1].length)
  const [activity, list] = ranked[0] ?? []
  if (!list || list.length < MIN_SKIP_STREAK) return null

  // Prefer consecutive weeks if week keys present; else count threshold.
  const weeks = new Set(list.map(s => String(s.payload.weekKey ?? s.occurredAt.slice(0, 10))))
  if (weeks.size < Math.min(MIN_SKIP_STREAK, list.length) && list.length < MIN_SKIP_STREAK) return null

  const evidence = list.slice(0, 20).map(s => createEvidence({
    summary: `Skipped ${activity}`,
    detail: typeof s.payload.reason === 'string' ? s.payload.reason : undefined,
    source: { kind: sourceKindFromDomain(s.domain), label: s.domain },
    observedAt: s.occurredAt,
    weight: 0.7,
  }))

  return {
    category: 'preferences',
    key: `avoids_${activity.replace(/\s+/g, '_')}`,
    label: `Avoids ${activity}`,
    value: activity,
    displayValue: `Avoids ${activity}`,
    evidence,
    relevanceTags: ['preferences', 'habits'],
    minSignals: MIN_SKIP_STREAK,
  }
}

function sleepPerformanceLink(signals: ObservationSignal[]): InferenceCandidate | null {
  const pairs = signals.filter(s => s.signalType === 'performance_with_sleep')
  if (pairs.length < MIN_SLEEP_PERF) return null
  let weakAfterPoor = 0
  const supporting: ObservationSignal[] = []
  for (const s of pairs) {
    const sleepHours = Number(s.payload.sleepHours)
    const performance = String(s.payload.performance ?? '')
    if (!Number.isFinite(sleepHours)) continue
    if (sleepHours < 6 && (performance === 'weak' || performance === 'low' || performance === 'poor')) {
      weakAfterPoor += 1
      supporting.push(s)
    }
  }
  if (weakAfterPoor < MIN_SLEEP_PERF) return null
  const share = weakAfterPoor / pairs.length
  if (share < 0.6) return null

  const evidence = supporting.slice(0, 20).map(s => createEvidence({
    summary: `Weaker session after ${s.payload.sleepHours}h sleep`,
    source: { kind: sourceKindFromDomain(s.domain), label: s.domain },
    observedAt: s.occurredAt,
    weight: 0.85,
  }))

  return {
    category: 'health',
    key: 'performance_decreases_after_poor_sleep',
    label: 'Performance decreases after poor sleep',
    value: true,
    displayValue: 'Performance decreases after poor sleep',
    evidence,
    relevanceTags: ['health', 'recovery', 'performance'],
    minSignals: MIN_SLEEP_PERF,
  }
}

/** Attach confidence to a candidate using its evidence. */
export function confidenceForCandidate(candidate: InferenceCandidate): number {
  const newest = newestEvidenceAt(candidate.evidence)
  return calculateObservationConfidence({
    observationCount: candidate.evidence.length,
    averageWeight: averageEvidenceWeight(candidate.evidence),
    consistency: Math.min(1, candidate.evidence.length / Math.max(candidate.minSignals, 1)),
    daysSinceLastEvidence: newest ? daysBetween(newest) : 999,
    contradictionCount: 0,
  })
}

export function buildObservedFactFromCandidate(
  candidate: InferenceCandidate,
  confidence: number,
  existingId?: string,
): IdentityFact {
  const now = nowISO()
  return {
    id: existingId ?? newIdentityId(),
    category: candidate.category,
    key: candidate.key,
    label: candidate.label,
    value: candidate.value,
    displayValue: candidate.displayValue || displayValueFromUnknown(candidate.value),
    kind: 'observed',
    confidence,
    source: {
      kind: 'system',
      label: 'Identity observation engine',
      detail: `${candidate.evidence.length} supporting signals`,
    },
    evidenceIds: candidate.evidence.map(e => e.id),
    status: 'active',
    relevanceTags: candidate.relevanceTags,
    createdAt: now,
    updatedAt: now,
    lastObservedAt: newestEvidenceAt(candidate.evidence) ?? now,
  }
}

function hourFromSignal(s: ObservationSignal): number | null {
  if (typeof s.payload.hour === 'number') return s.payload.hour
  const t = Date.parse(s.occurredAt)
  if (!Number.isFinite(t)) return null
  return new Date(t).getHours()
}

function weekdayName(iso: string): string | null {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(t).getDay()]
}

function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  const suffix = h >= 12 ? 'pm' : 'am'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${suffix}`
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function sourceKindFromDomain(domain: string): import('./identityTypes').IdentitySourceKind {
  const d = domain.toLowerCase()
  if (d.includes('workout') || d.includes('training') || d.includes('gym')) return 'workout_history'
  if (d.includes('calendar')) return 'calendar'
  if (d.includes('task')) return 'tasks'
  if (d.includes('note')) return 'notes'
  if (d.includes('journal')) return 'journal'
  return 'system'
}
