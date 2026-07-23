/**
 * Merge noisy events into meaningful timeline summaries.
 */

import { aggregationFamily } from './RealityEvents'
import type { RealityAggregation, RealityEvent } from './RealityTypes'
import { average, dayKey, newRealityId, nowISO } from './RealityUtils'

const NOISE_TYPES = new Set([
  'workout_logged',
  'workout_started',
  'set_logged',
  'object_updated',
  'project_updated',
  'capture_processed',
  'signal_created',
  'custom',
])

export function shouldPreferAggregation(events: RealityEvent[]): boolean {
  return events.length >= 3
}

function groupKey(event: RealityEvent): string {
  const day = dayKey(event.timestamp)
  const family = aggregationFamily(event.eventType)
  const entity = event.entity?.id ?? event.entity?.label ?? 'none'
  return `${day}|${event.domain}|${family}|${entity}`
}

function titleForGroup(events: RealityEvent[]): string {
  const primary = events.find(e => e.importance >= 0.7) ?? events[0]
  const family = aggregationFamily(primary.eventType)
  if (family === 'workout') {
    const name = primary.entity?.label ?? primary.title
    return events.length > 1 ? `Completed ${name}` : primary.title
  }
  if (family === 'task') {
    const label = primary.entity?.label ?? primary.title
    return events.length > 1 ? `${label} — ${events.length} updates` : primary.title
  }
  if (family === 'project') {
    const label = primary.entity?.label ?? primary.title
    return events.length > 1 ? `${label} progressed` : primary.title
  }
  return events.length > 1 ? `${primary.title} (${events.length})` : primary.title
}

function summaryForGroup(events: RealityEvent[]): string {
  const titles = [...new Set(events.map(e => e.title))].slice(0, 4)
  return `${events.length} related events: ${titles.join('; ')}`
}

/**
 * Rebuild aggregations for active events.
 * Marks noisy member events as aggregated when a group is large enough.
 */
export function rebuildAggregations(events: RealityEvent[]): {
  aggregations: RealityAggregation[]
  events: RealityEvent[]
} {
  const active = events.filter(e => e.status === 'active' || e.status === 'aggregated')
  const groups = new Map<string, RealityEvent[]>()
  for (const event of active) {
    const key = groupKey(event)
    const list = groups.get(key) ?? []
    list.push(event)
    groups.set(key, list)
  }

  const aggregations: RealityAggregation[] = []
  const aggregatedIds = new Set<string>()
  const now = nowISO()

  for (const [, group] of groups) {
    const sorted = [...group].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    const noisy = sorted.filter(e => NOISE_TYPES.has(e.eventType) || e.importance < 0.5)
    if (!shouldPreferAggregation(sorted) && noisy.length < 3) continue
    if (sorted.length < 2) continue

    const id = newRealityId('agg')
    const tags = [...new Set(sorted.flatMap(e => e.specialistTags))]
    aggregations.push({
      id,
      domain: sorted[0].domain,
      title: titleForGroup(sorted),
      summary: summaryForGroup(sorted),
      eventIds: sorted.map(e => e.id),
      eventType: aggregationFamily(sorted[0].eventType),
      startAt: sorted[0].timestamp,
      endAt: sorted[sorted.length - 1].timestamp,
      importance: Math.max(...sorted.map(e => e.importance)),
      confidence: average(sorted.map(e => e.confidence)),
      specialistTags: tags,
      createdAt: now,
      updatedAt: now,
    })

    // Collapse noisy members; keep high-importance peers visible.
    for (const e of sorted) {
      if (e.importance < 0.75 || NOISE_TYPES.has(e.eventType)) {
        aggregatedIds.add(e.id)
      }
    }
  }

  const nextEvents = events.map(e => {
    if (!aggregatedIds.has(e.id)) {
      if (e.status === 'aggregated') {
        return { ...e, status: 'active' as const, aggregationId: undefined, updatedAt: now }
      }
      return e
    }
    const agg = aggregations.find(a => a.eventIds.includes(e.id))
    return {
      ...e,
      status: 'aggregated' as const,
      aggregationId: agg?.id,
      updatedAt: now,
    }
  })

  return { aggregations, events: nextEvents }
}
