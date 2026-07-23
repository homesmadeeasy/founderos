/**
 * RealityEngine — sole mutation authority for FounderOS live operating state.
 * Specialists must only read via the public API / context helpers.
 */

import { rebuildAggregations } from './RealityAggregator'
import { resolveEventConfidence } from './RealityConfidence'
import { createEvidence } from './RealityEvidence'
import { mappingForKernelType } from './RealityEvents'
import { emptyRealityDatastore } from './RealitySchema'
import { buildRealitySnapshot, cacheSnapshot } from './RealitySnapshot'
import { buildTimeline, flattenTimeline, getTodayTimeline } from './RealityTimeline'
import type {
  RealityDatastore,
  RealityEvidence,
  RealityEvent,
  RealitySnapshot,
  RealitySpecialistView,
  RealityTimelineDay,
  RealityTimelineItem,
  RecordRealityEventInput,
  SpecialistId,
} from './RealityTypes'
import { clamp01, newRealityId, nowISO } from './RealityUtils'
import { validateRecordEventInput } from './RealityValidation'
import type { RealityRepository } from './RealityRepository'
import type { FounderEvent } from '@/lib/founder-kernel/kernelTypes'
import type { TimelineOptions } from './RealityTimeline'

export class RealityEngine {
  constructor(private readonly repo: RealityRepository) {}

  async load(): Promise<RealityDatastore> {
    return this.repo.load()
  }

  async recordEvent(input: RecordRealityEventInput): Promise<{
    store: RealityDatastore
    event: RealityEvent
    created: boolean
  }> {
    const error = validateRecordEventInput(input)
    if (error) throw new Error(error)

    const store = await this.repo.load()
    const now = nowISO()
    const timestamp = input.timestamp ?? now
    const kind = input.kind ?? 'declared'
    const confidence = resolveEventConfidence(kind, input.confidence)

    if (input.idempotencyKey) {
      const existing = store.events.find(e => e.idempotencyKey === input.idempotencyKey)
      if (existing) {
        return { store, event: existing, created: false }
      }
    }

    const evidence = (input.evidenceSummaries ?? []).map(summary => createEvidence({
      summary,
      source: input.source,
    }))

    const event: RealityEvent = {
      id: newRealityId('evt'),
      timestamp,
      domain: input.domain,
      entity: input.entity,
      eventType: input.eventType.trim(),
      title: input.title.trim(),
      summary: input.summary?.trim(),
      metadata: input.metadata ?? {},
      importance: clamp01(input.importance ?? 0.5),
      confidence,
      evidenceIds: evidence.map(e => e.id),
      source: input.source,
      status: 'active',
      kind,
      specialistTags: [...new Set(input.specialistTags ?? [input.domain])],
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    }

    const linkedEvidence = evidence.map(e => ({ ...e, eventId: event.id }))
    let next: RealityDatastore = {
      ...store,
      events: [event, ...store.events],
      evidence: [...linkedEvidence, ...store.evidence],
      updatedAt: now,
    }

    const rebuilt = rebuildAggregations(next.events)
    next = { ...next, events: rebuilt.events, aggregations: rebuilt.aggregations }

    const snapshot = buildRealitySnapshot(next, { now })
    next = cacheSnapshot(next, snapshot, newRealityId('snap'))

    await this.repo.save(next)
    return { store: next, event, created: true }
  }

  async recordEvents(inputs: RecordRealityEventInput[]): Promise<{
    store: RealityDatastore
    events: RealityEvent[]
    createdCount: number
  }> {
    let store = await this.repo.load()
    const created: RealityEvent[] = []
    let createdCount = 0

    for (const input of inputs) {
      // Sequential so idempotency sees prior inserts in-batch.
      const engine = new RealityEngine({
        load: async () => store,
        save: async (next) => { store = next },
      })
      const result = await engine.recordEvent(input)
      store = result.store
      created.push(result.event)
      if (result.created) createdCount += 1
    }

    await this.repo.save(store)
    return { store, events: created, createdCount }
  }

  async ingestKernelEvent(event: FounderEvent): Promise<{
    store: RealityDatastore
    event: RealityEvent | null
    created: boolean
  }> {
    const mapping = mappingForKernelType(event.type)
    if (!mapping) {
      return { store: await this.repo.load(), event: null, created: false }
    }
    const payload = event.payload ?? {}
    return this.recordEvent({
      timestamp: event.timestamp,
      domain: mapping.domain,
      eventType: mapping.eventType,
      title: mapping.titleFromPayload(payload),
      summary: typeof payload.summary === 'string' ? payload.summary : undefined,
      metadata: { ...payload, kernelType: event.type, kernelEventId: event.id },
      importance: mapping.importance,
      kind: 'declared',
      source: {
        kind: mapping.sourceKind,
        label: `Kernel · ${event.type}`,
        externalId: event.id,
      },
      specialistTags: [mapping.domain],
      idempotencyKey: `kernel:${event.id}`,
      evidenceSummaries: [`Kernel event ${event.type}`],
    })
  }

  async dismissEvent(eventId: string): Promise<RealityDatastore> {
    const store = await this.repo.load()
    const now = nowISO()
    const events = store.events.map(e =>
      e.id === eventId ? { ...e, status: 'dismissed' as const, updatedAt: now } : e,
    )
    const rebuilt = rebuildAggregations(events)
    const next: RealityDatastore = {
      ...store,
      events: rebuilt.events,
      aggregations: rebuilt.aggregations,
      updatedAt: now,
    }
    const snapshot = buildRealitySnapshot(next, { now })
    const cached = cacheSnapshot(next, snapshot, newRealityId('snap'))
    await this.repo.save(cached)
    return cached
  }

  getTimeline(store: RealityDatastore, options?: TimelineOptions): RealityTimelineDay[] {
    return buildTimeline(store, options)
  }

  getToday(store: RealityDatastore, specialistId?: SpecialistId): RealityTimelineDay | null {
    return getTodayTimeline(store, { specialistId })
  }

  getRecentEvents(store: RealityDatastore, limit = 25, specialistId?: SpecialistId): RealityTimelineItem[] {
    return flattenTimeline(buildTimeline(store, { specialistId, preferAggregations: true, limit }))
  }

  getSnapshot(store: RealityDatastore, specialistId?: SpecialistId): RealitySnapshot {
    return buildRealitySnapshot(store, { specialistId })
  }

  getCurrentFocus(store: RealityDatastore, specialistId?: SpecialistId) {
    return this.getSnapshot(store, specialistId).currentProjects
  }

  getMomentum(store: RealityDatastore, specialistId?: SpecialistId) {
    return this.getSnapshot(store, specialistId).momentum
  }

  getEvidenceForEvent(store: RealityDatastore, eventId: string): RealityEvidence[] {
    const event = store.events.find(e => e.id === eventId)
    if (!event) return []
    const ids = new Set(event.evidenceIds)
    return store.evidence.filter(e => e.eventId === eventId || ids.has(e.id))
  }

  getSpecialistView(store: RealityDatastore, specialistId?: SpecialistId): RealitySpecialistView {
    const snapshot = this.getSnapshot(store, specialistId)
    return {
      snapshot,
      today: this.getToday(store, specialistId),
      recent: this.getRecentEvents(store, 20, specialistId),
      focus: snapshot.currentProjects,
      momentum: snapshot.momentum,
      updatedAt: store.updatedAt,
    }
  }
}

export function createEmptyRealityStore(): RealityDatastore {
  return emptyRealityDatastore()
}
