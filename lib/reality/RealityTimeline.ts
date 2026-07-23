/**
 * Unified Reality timeline — day-grouped, noise-aware.
 */

import { isAssumption } from './RealityConfidence'
import type {
  RealityAggregation,
  RealityDatastore,
  RealityDomain,
  RealityEvent,
  RealityTimelineDay,
  RealityTimelineItem,
  SpecialistId,
} from './RealityTypes'
import { dayKey, formatDayLabel } from './RealityUtils'

export interface TimelineOptions {
  from?: string
  to?: string
  domain?: RealityDomain
  specialistId?: SpecialistId
  limit?: number
  /** When true, hide events already rolled into aggregations. */
  preferAggregations?: boolean
}

function eventToItem(event: RealityEvent): RealityTimelineItem {
  return {
    id: event.id,
    kind: 'event',
    timestamp: event.timestamp,
    domain: event.domain,
    title: event.title,
    summary: event.summary,
    importance: event.importance,
    confidence: event.confidence,
    eventType: event.eventType,
    specialistTags: event.specialistTags,
    status: event.status,
    isAssumption: isAssumption(event),
  }
}

function aggregationToItem(agg: RealityAggregation): RealityTimelineItem {
  return {
    id: agg.id,
    kind: 'aggregation',
    timestamp: agg.endAt,
    domain: agg.domain,
    title: agg.title,
    summary: agg.summary,
    importance: agg.importance,
    confidence: agg.confidence,
    eventType: agg.eventType,
    specialistTags: agg.specialistTags,
    status: 'aggregated_summary',
    isAssumption: agg.confidence < 0.95,
  }
}

function matchesFilter(
  specialistTags: SpecialistId[],
  domain: RealityDomain,
  options: TimelineOptions,
): boolean {
  if (options.domain && domain !== options.domain) return false
  if (options.specialistId && !specialistTags.includes(options.specialistId) && domain !== options.specialistId) {
    return false
  }
  return true
}

export function buildTimeline(
  store: RealityDatastore,
  options: TimelineOptions = {},
): RealityTimelineDay[] {
  const preferAgg = options.preferAggregations !== false
  const items: RealityTimelineItem[] = []

  for (const event of store.events) {
    if (event.status === 'dismissed' || event.status === 'superseded') continue
    if (preferAgg && event.status === 'aggregated') continue
    if (options.from && event.timestamp < options.from) continue
    if (options.to && event.timestamp > options.to) continue
    if (!matchesFilter(event.specialistTags, event.domain, options)) continue
    items.push(eventToItem(event))
  }

  if (preferAgg) {
    for (const agg of store.aggregations) {
      if (options.from && agg.endAt < options.from) continue
      if (options.to && agg.startAt > options.to) continue
      if (!matchesFilter(agg.specialistTags, agg.domain, options)) continue
      items.push(aggregationToItem(agg))
    }
  }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const limited = typeof options.limit === 'number' ? items.slice(0, options.limit) : items

  const byDay = new Map<string, RealityTimelineItem[]>()
  for (const item of limited) {
    const key = dayKey(item.timestamp)
    const list = byDay.get(key) ?? []
    list.push(item)
    byDay.set(key, list)
  }

  return [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, dayItems]) => ({
      date,
      label: formatDayLabel(date),
      items: dayItems.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    }))
}

export function flattenTimeline(days: RealityTimelineDay[]): RealityTimelineItem[] {
  return days.flatMap(d => d.items)
}

export function getTodayTimeline(
  store: RealityDatastore,
  options: Omit<TimelineOptions, 'from' | 'to'> = {},
  now = new Date(),
): RealityTimelineDay | null {
  const key = dayKey(now.toISOString())
  const days = buildTimeline(store, options)
  return days.find(d => d.date === key) ?? {
    date: key,
    label: 'Today',
    items: [],
  }
}
