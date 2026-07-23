/**
 * Pure snapshot builder — current operating state for specialists / AI.
 */

import { buildTimeline, flattenTimeline } from './RealityTimeline'
import type {
  RealityActionItem,
  RealityDatastore,
  RealityEvent,
  RealityFocusItem,
  RealityRiskItem,
  RealitySnapshot,
  RealityWinItem,
  SpecialistId,
} from './RealityTypes'
import { dayKey, daysAgoISO, nowISO } from './RealityUtils'

function activeEvents(store: RealityDatastore): RealityEvent[] {
  return store.events.filter(e => e.status === 'active' || e.status === 'aggregated')
}

function isToday(iso: string, now: string): boolean {
  return dayKey(iso) === dayKey(now)
}

function inLastDays(iso: string, days: number, now: string): boolean {
  return iso >= daysAgoISO(days, now)
}

function momentumFrom(events: RealityEvent[], now: string): RealitySnapshot['momentum'] {
  const week = events.filter(e => inLastDays(e.timestamp, 7, now) && e.importance >= 0.45)
  const wins = week.filter(e =>
    ['workout_completed', 'task_finished', 'goal_achieved', 'study_session', 'decision_accepted', 'object_completed']
      .includes(e.eventType) || e.eventType.includes('completed') || e.eventType.includes('finished'),
  )
  const blocked = week.filter(e => e.eventType.includes('blocked') || e.metadata.blocked === true)
  const raw = Math.min(1, wins.length * 0.12 + week.length * 0.03 - blocked.length * 0.1)
  const score = Math.round(Math.max(0, raw) * 100) / 100
  let label = 'Steady'
  if (score >= 0.7) label = 'Strong'
  else if (score >= 0.45) label = 'Building'
  else if (score < 0.25) label = 'Quiet'
  const confidence = week.length >= 5 ? 0.85 : week.length >= 2 ? 0.65 : 0.4
  return {
    score,
    label,
    confidence,
    note: `${wins.length} meaningful completions and ${week.length} events in the last 7 days.`,
  }
}

function focusItems(events: RealityEvent[], now: string): RealityFocusItem[] {
  const recent = events
    .filter(e => inLastDays(e.timestamp, 3, now))
    .filter(e =>
      ['project_created', 'project_updated', 'goal_changed', 'workout_started', 'task_created'].includes(e.eventType)
      || e.importance >= 0.7,
    )
    .sort((a, b) => b.importance - a.importance || b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6)

  return recent.map(e => ({
    id: `focus_${e.id}`,
    label: e.entity?.label ?? e.title,
    domain: e.domain,
    reason: e.summary ?? e.title,
    importance: e.importance,
    eventId: e.id,
  }))
}

function todaysWorkout(events: RealityEvent[], now: string): RealityFocusItem | undefined {
  const workout = events
    .filter(e => isToday(e.timestamp, now) && e.domain === 'gym')
    .filter(e => e.eventType.startsWith('workout_'))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
  if (!workout) return undefined
  return {
    id: `workout_${workout.id}`,
    label: workout.entity?.label ?? workout.title,
    domain: 'gym',
    reason: workout.summary ?? workout.title,
    importance: workout.importance,
    eventId: workout.id,
  }
}

function wins(events: RealityEvent[], now: string): RealityWinItem[] {
  return events
    .filter(e => inLastDays(e.timestamp, 7, now))
    .filter(e =>
      ['workout_completed', 'task_finished', 'goal_achieved', 'study_session', 'decision_accepted'].includes(e.eventType)
      || e.importance >= 0.8,
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8)
    .map(e => ({
      id: `win_${e.id}`,
      label: e.title,
      domain: e.domain,
      at: e.timestamp,
      eventId: e.id,
    }))
}

function risks(events: RealityEvent[], now: string): RealityRiskItem[] {
  return events
    .filter(e => inLastDays(e.timestamp, 14, now))
    .filter(e =>
      e.eventType.includes('blocked')
      || e.metadata.risk === true
      || e.metadata.pain === true
      || (typeof e.metadata.severity === 'number' && e.metadata.severity >= 0.6),
    )
    .slice(0, 6)
    .map(e => ({
      id: `risk_${e.id}`,
      label: e.title,
      domain: e.domain,
      severity: typeof e.metadata.severity === 'number' ? e.metadata.severity : 0.6,
      reason: e.summary ?? 'Flagged from recent activity',
      eventId: e.id,
    }))
}

function outstanding(events: RealityEvent[], now: string): RealityActionItem[] {
  return events
    .filter(e => inLastDays(e.timestamp, 14, now))
    .filter(e =>
      e.eventType === 'task_created'
      || e.metadata.open === true
      || e.eventType === 'calendar_event',
    )
    .slice(0, 10)
    .map(e => ({
      id: `task_${e.id}`,
      label: e.title,
      domain: e.domain,
      dueHint: typeof e.metadata.dueAt === 'string' ? e.metadata.dueAt : undefined,
      eventId: e.id,
    }))
}

function blocked(events: RealityEvent[], now: string): RealityActionItem[] {
  return events
    .filter(e => inLastDays(e.timestamp, 14, now))
    .filter(e => e.eventType.includes('blocked') || e.metadata.blocked === true)
    .slice(0, 8)
    .map(e => ({
      id: `blocked_${e.id}`,
      label: e.title,
      domain: e.domain,
      eventId: e.id,
    }))
}

function deadlines(events: RealityEvent[], now: string): RealityActionItem[] {
  return events
    .filter(e => typeof e.metadata.dueAt === 'string' && (e.metadata.dueAt as string) >= now)
    .sort((a, b) => String(a.metadata.dueAt).localeCompare(String(b.metadata.dueAt)))
    .slice(0, 8)
    .map(e => ({
      id: `due_${e.id}`,
      label: e.title,
      domain: e.domain,
      dueHint: String(e.metadata.dueAt),
      eventId: e.id,
    }))
}

function decisions(events: RealityEvent[], now: string): RealityWinItem[] {
  return events
    .filter(e => inLastDays(e.timestamp, 14, now) && e.eventType === 'decision_accepted')
    .slice(0, 6)
    .map(e => ({
      id: `dec_${e.id}`,
      label: e.title,
      domain: e.domain,
      at: e.timestamp,
      eventId: e.id,
    }))
}

function habitHints(events: RealityEvent[], now: string): string[] {
  const week = events.filter(e => inLastDays(e.timestamp, 7, now))
  const hints: string[] = []
  const workouts = week.filter(e => e.eventType === 'workout_completed').length
  if (workouts >= 3) hints.push(`Trained ${workouts} times this week`)
  const journals = week.filter(e => e.eventType === 'journal_entry').length
  if (journals >= 2) hints.push(`Journaled ${journals} times this week`)
  const study = week.filter(e => e.eventType === 'study_session').length
  if (study >= 2) hints.push(`${study} study sessions this week`)
  return hints
}

function energyRecovery(events: RealityEvent[], now: string): Pick<RealitySnapshot, 'energy' | 'recovery'> {
  const sleep = events
    .filter(e => e.eventType === 'sleep_logged' && inLastDays(e.timestamp, 3, now))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
  const recoveryEvt = events
    .filter(e => (e.eventType.includes('recovery') || e.metadata.recovery) && inLastDays(e.timestamp, 3, now))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]

  const energy = sleep
    ? {
        label: typeof sleep.metadata.quality === 'string' ? String(sleep.metadata.quality) : 'Sleep logged',
        confidence: sleep.confidence,
        note: sleep.summary,
      }
    : undefined

  const recovery = recoveryEvt
    ? {
        label: typeof recoveryEvt.metadata.recovery === 'string'
          ? String(recoveryEvt.metadata.recovery)
          : recoveryEvt.title,
        confidence: recoveryEvt.confidence,
        note: recoveryEvt.summary,
      }
    : undefined

  return { energy, recovery }
}

export function buildRealitySnapshot(
  store: RealityDatastore,
  options: { specialistId?: SpecialistId; now?: string } = {},
): RealitySnapshot {
  const now = options.now ?? nowISO()
  let events = activeEvents(store)
  if (options.specialistId) {
    events = events.filter(e =>
      e.specialistTags.includes(options.specialistId!)
      || e.domain === options.specialistId,
    )
  }

  const todayItems = flattenTimeline(buildTimeline(store, {
    specialistId: options.specialistId,
    preferAggregations: true,
  })).filter(i => isToday(i.timestamp, now))

  const weekItems = flattenTimeline(buildTimeline(store, {
    specialistId: options.specialistId,
    from: daysAgoISO(7, now),
    preferAggregations: true,
  }))

  const { energy, recovery } = energyRecovery(events, now)
  const currentProjects = focusItems(events, now)
  const momentum = momentumFrom(events, now)
  const recentWins = wins(events, now)
  const riskItems = risks(events, now)
  const outstandingTasks = outstanding(events, now)
  const blockedItems = blocked(events, now)
  const upcomingDeadlines = deadlines(events, now)
  const recentDecisions = decisions(events, now)
  const habits = habitHints(events, now)
  const workout = todaysWorkout(events, now)

  const narrativeHints: string[] = []
  if (todayItems.length) narrativeHints.push(`Today: ${todayItems.length} notable timeline items.`)
  if (workout) narrativeHints.push(`Today's workout signal: ${workout.label}.`)
  if (recentWins[0]) narrativeHints.push(`Recent win: ${recentWins[0].label}.`)
  if (riskItems[0]) narrativeHints.push(`Watch: ${riskItems[0].label}.`)
  narrativeHints.push(`Momentum: ${momentum.label} (${Math.round(momentum.score * 100)}%).`)
  if (momentum.confidence < 0.6) {
    narrativeHints.push('Momentum is an estimate — limited recent evidence.')
  }
  for (const h of habits.slice(0, 2)) narrativeHints.push(h)

  return {
    generatedAt: now,
    windowStart: daysAgoISO(7, now),
    windowEnd: now,
    energy,
    recovery,
    currentProjects,
    todaysWorkout: workout,
    upcomingDeadlines,
    recentWins,
    risks: riskItems,
    habits,
    momentum,
    outstandingTasks,
    blockedItems,
    recentDecisions,
    narrativeHints,
    eventCountToday: todayItems.length,
    eventCountWeek: weekItems.length,
  }
}

export function cacheSnapshot(
  store: RealityDatastore,
  snapshot: RealitySnapshot,
  id: string,
): RealityDatastore {
  const record = { id, snapshot, createdAt: snapshot.generatedAt }
  return {
    ...store,
    snapshots: [record, ...store.snapshots].slice(0, 20),
    updatedAt: snapshot.generatedAt,
  }
}
