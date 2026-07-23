/**
 * Reality Engine tests — events, timeline, aggregation, snapshot, repos, kernel mapping.
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: () => null,
    length: 0,
  } as Storage
}

import assert from 'node:assert/strict'
import {
  RealityEngine,
  adapterSignalToRealityInput,
  buildRealityPromptBlockSync,
  createLocalRealityRepository,
  createMemoryRealityRepository,
  enqueueRealityCloudSave,
  clearRealityPendingForTests,
  resetRealityStorageForTests,
  gymWorkoutAdapter,
  founderTaskAdapter,
  mappingForKernelType,
  validateRecordEventInput,
  type RecordRealityEventInput,
} from './index'
import { REALITY_PENDING_KEY } from './RealityTypes'
import type { FounderEvent } from '@/lib/founder-kernel/kernelTypes'

async function main() {
  console.log('Reality Engine tests\n')

  // Event creation
  {
    const repo = createMemoryRealityRepository()
    const engine = new RealityEngine(repo)
    const { event, created } = await engine.recordEvent({
      domain: 'gym',
      eventType: 'workout_completed',
      title: 'Push Day',
      source: { kind: 'gym', label: 'Gym' },
      importance: 0.9,
      specialistTags: ['gym'],
    })
    assert.equal(created, true)
    assert.equal(event.title, 'Push Day')
    assert.equal(event.confidence, 1)
    assert.equal(event.kind, 'declared')
    console.log('PASS: event creation')
  }

  // Idempotency
  {
    const repo = createMemoryRealityRepository()
    const engine = new RealityEngine(repo)
    const input: RecordRealityEventInput = {
      domain: 'tasks',
      eventType: 'task_finished',
      title: 'Ship docs',
      source: { kind: 'tasks', label: 'Tasks' },
      idempotencyKey: 'task:1',
    }
    const a = await engine.recordEvent(input)
    const b = await engine.recordEvent(input)
    assert.equal(a.created, true)
    assert.equal(b.created, false)
    assert.equal(a.event.id, b.event.id)
    const store = await engine.load()
    assert.equal(store.events.filter(e => e.idempotencyKey === 'task:1').length, 1)
    console.log('PASS: idempotent event ingest')
  }

  // Timeline ordering
  {
    const repo = createMemoryRealityRepository()
    const engine = new RealityEngine(repo)
    await engine.recordEvent({
      domain: 'journal',
      eventType: 'journal_entry',
      title: 'Morning notes',
      timestamp: '2026-07-20T08:00:00.000Z',
      source: { kind: 'journal', label: 'Journal' },
    })
    await engine.recordEvent({
      domain: 'gym',
      eventType: 'workout_completed',
      title: 'Legs',
      timestamp: '2026-07-20T18:00:00.000Z',
      source: { kind: 'gym', label: 'Gym' },
      importance: 0.85,
    })
    await engine.recordEvent({
      domain: 'founder',
      eventType: 'project_updated',
      title: 'Docs',
      timestamp: '2026-07-20T12:00:00.000Z',
      source: { kind: 'founder', label: 'Founder' },
    })
    const store = await engine.load()
    const flat = engine.getRecentEvents(store, 10)
    assert.ok(flat[0].timestamp >= flat[1].timestamp)
    assert.ok(flat[1].timestamp >= flat[2].timestamp)
    console.log('PASS: timeline ordering')
  }

  // Aggregation reduces noise
  {
    const repo = createMemoryRealityRepository()
    const engine = new RealityEngine(repo)
    for (let i = 0; i < 6; i++) {
      await engine.recordEvent({
        domain: 'gym',
        eventType: 'workout_logged',
        title: `Set log ${i}`,
        timestamp: `2026-07-21T1${i}:00:00.000Z`,
        source: { kind: 'gym', label: 'Gym' },
        importance: 0.4,
        entity: { type: 'workout', id: 'w1', label: 'Push Day' },
        specialistTags: ['gym'],
      })
    }
    const store = await engine.load()
    assert.ok(store.aggregations.length >= 1)
    assert.ok(store.events.some(e => e.status === 'aggregated'))
    const timeline = engine.getTimeline(store, { preferAggregations: true })
    const titles = timeline.flatMap(d => d.items.map(i => i.title))
    assert.ok(titles.some(t => /Push Day|Completed/i.test(t) || t.includes('updates') || t.includes('(')))
    console.log('PASS: aggregation')
  }

  // Snapshot generation
  {
    const repo = createMemoryRealityRepository()
    const engine = new RealityEngine(repo)
    const now = new Date().toISOString()
    await engine.recordEvent({
      domain: 'gym',
      eventType: 'workout_completed',
      title: 'Upper',
      timestamp: now,
      source: { kind: 'gym', label: 'Gym' },
      importance: 0.9,
      specialistTags: ['gym'],
    })
    await engine.recordEvent({
      domain: 'tasks',
      eventType: 'task_blocked',
      title: 'Blocked deploy',
      timestamp: now,
      source: { kind: 'tasks', label: 'Tasks' },
      metadata: { blocked: true, severity: 0.7 },
      importance: 0.8,
    })
    const store = await engine.load()
    const snap = engine.getSnapshot(store)
    assert.ok(snap.narrativeHints.length > 0)
    assert.ok(snap.momentum.label)
    assert.ok(snap.recentWins.length >= 1 || snap.eventCountToday >= 1)
    assert.ok(snap.risks.length >= 1)
    const prompt = buildRealityPromptBlockSync(store, 'gym', engine)
    assert.ok(prompt.includes('Reality snapshot'))
    console.log('PASS: snapshot generation')
  }

  // Confidence / assumptions
  {
    const repo = createMemoryRealityRepository()
    const engine = new RealityEngine(repo)
    const { event } = await engine.recordEvent({
      domain: 'calendar',
      eventType: 'calendar_event',
      title: 'Maybe meeting',
      kind: 'inferred',
      confidence: 0.4,
      source: { kind: 'calendar', label: 'Calendar' },
    })
    assert.equal(event.kind, 'inferred')
    assert.ok(event.confidence < 0.95)
    const store = await engine.load()
    const recent = engine.getRecentEvents(store, 5)
    assert.ok(recent.some(r => r.isAssumption))
    console.log('PASS: inferred confidence / assumptions')
  }

  // Validation
  {
    assert.ok(validateRecordEventInput({
      domain: 'gym',
      eventType: '',
      title: 'x',
      source: { kind: 'gym', label: 'Gym' },
    }))
    assert.equal(validateRecordEventInput({
      domain: 'gym',
      eventType: 'workout_completed',
      title: 'Push',
      source: { kind: 'gym', label: 'Gym' },
    }), null)
    console.log('PASS: evidence / input validation')
  }

  // Repository compatibility + offline queue
  {
    resetRealityStorageForTests()
    clearRealityPendingForTests()
    const local = createLocalRealityRepository()
    const engine = new RealityEngine(local)
    await engine.recordEvent({
      domain: 'memory',
      eventType: 'memory_created',
      title: 'Note',
      source: { kind: 'memory', label: 'Memory' },
    })
    const loaded = await local.load()
    assert.equal(loaded.events.length, 1)

    enqueueRealityCloudSave(loaded)
    const raw = localStorage.getItem(REALITY_PENDING_KEY)
    assert.ok(raw)
    const pending = JSON.parse(raw!) as unknown[]
    assert.equal(pending.length, 1)
    enqueueRealityCloudSave(loaded)
    const pending2 = JSON.parse(localStorage.getItem(REALITY_PENDING_KEY)!) as unknown[]
    assert.equal(pending2.length, 1)
    console.log('PASS: repository compatibility + offline pending queue')
  }

  // Kernel mapping + ingest
  {
    const repo = createMemoryRealityRepository()
    const engine = new RealityEngine(repo)
    assert.ok(mappingForKernelType('WorkoutCompleted'))
    const kernelEvent: FounderEvent = {
      id: 'ke_1',
      type: 'WorkoutCompleted',
      source: 'gym',
      timestamp: new Date().toISOString(),
      payload: { title: 'Pull Day', summary: 'Finished pull' },
      status: 'completed',
    }
    const first = await engine.ingestKernelEvent(kernelEvent)
    assert.equal(first.created, true)
    assert.equal(first.event?.eventType, 'workout_completed')
    const second = await engine.ingestKernelEvent(kernelEvent)
    assert.equal(second.created, false)
    console.log('PASS: kernel integration')
  }

  // Specialist adapters
  {
    const repo = createMemoryRealityRepository()
    const engine = new RealityEngine(repo)
    const signals = [
      gymWorkoutAdapter({ id: 'g1', title: 'Push', status: 'completed' }),
      founderTaskAdapter({ id: 't1', title: 'Write API', status: 'finished', projectLabel: 'FounderOS' }),
    ]
    const { createdCount } = await engine.recordEvents(signals.map(adapterSignalToRealityInput))
    assert.equal(createdCount, 2)
    const store = await engine.load()
    const gymView = engine.getSpecialistView(store, 'gym')
    assert.ok(gymView.snapshot)
    assert.ok(gymView.momentum)
    console.log('PASS: specialist integration / adapters')
  }

  // Focus + momentum APIs
  {
    const repo = createMemoryRealityRepository()
    const engine = new RealityEngine(repo)
    await engine.recordEvent({
      domain: 'founder',
      eventType: 'project_created',
      title: 'Reality Engine',
      source: { kind: 'founder', label: 'Founder' },
      importance: 0.85,
    })
    const store = await engine.load()
    assert.ok(Array.isArray(engine.getCurrentFocus(store)))
    assert.ok(engine.getMomentum(store).label)
    assert.ok(engine.getToday(store))
    console.log('PASS: getToday / focus / momentum APIs')
  }

  console.log('\nAll Reality Engine tests passed.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
