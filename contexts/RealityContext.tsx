'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { publishEvent } from '@/lib/founder-kernel/publishEvent'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import type { FounderEvent } from '@/lib/founder-kernel/kernelTypes'
import {
  RealityEngine,
  REALITY_KERNEL_EVENT_TYPES,
  adapterSignalToRealityInput,
  createLocalFirstRealityRepository,
  createLocalRealityRepository,
  setRealityEngineForTests,
  type AdapterSignal,
  type RealityDatastore,
  type RealityEvent,
  type RealitySnapshot,
  type RealitySpecialistView,
  type RealityTimelineDay,
  type RealityTimelineItem,
  type RecordRealityEventInput,
  type SpecialistId,
} from '@/lib/reality'

interface RealityContextValue {
  ready: boolean
  store: RealityDatastore
  snapshot: RealitySnapshot
  recordEvent: (input: RecordRealityEventInput) => Promise<RealityEvent>
  ingestSignals: (signals: AdapterSignal[]) => Promise<RealityEvent[]>
  dismissEvent: (eventId: string) => Promise<void>
  refresh: () => Promise<void>
  getToday: (specialistId?: SpecialistId) => RealityTimelineDay | null
  getTimeline: (specialistId?: SpecialistId) => RealityTimelineDay[]
  getSnapshot: (specialistId?: SpecialistId) => RealitySnapshot
  getRecentEvents: (limit?: number, specialistId?: SpecialistId) => RealityTimelineItem[]
  getCurrentFocus: (specialistId?: SpecialistId) => RealitySnapshot['currentProjects']
  getMomentum: (specialistId?: SpecialistId) => RealitySnapshot['momentum']
  getViewForSpecialist: (specialistId: SpecialistId) => RealitySpecialistView
}

const RealityContext = createContext<RealityContextValue | null>(null)

function createBrowserEngine(): RealityEngine {
  const engine = new RealityEngine(createLocalFirstRealityRepository(createLocalRealityRepository()))
  setRealityEngineForTests(engine)
  return engine
}

export function RealityProvider({ children }: { children: ReactNode }) {
  const { registerSubscriber } = useFounderKernel()
  const [engine] = useState(() => createBrowserEngine())
  const [store, setStore] = useState<RealityDatastore>(() => ({
    version: 1,
    events: [],
    evidence: [],
    aggregations: [],
    snapshots: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const next = await engine.load()
    setStore(next)
  }, [engine])

  useEffect(() => {
    void refresh().then(() => setReady(true))
  }, [refresh])

  useEffect(() => {
    return registerSubscriber({
      id: 'reality-engine',
      name: 'Reality Engine',
      priority: 42,
      subscribedEvents: [...REALITY_KERNEL_EVENT_TYPES],
      handler: async (event: FounderEvent) => {
        const result = await engine.ingestKernelEvent(event)
        if (!result.created || !result.event) return
        setStore(result.store)
        void publishEvent({
          type: 'RealityEventRecorded',
          source: 'reality-engine',
          payload: {
            eventId: result.event.id,
            eventType: result.event.eventType,
            domain: result.event.domain,
            kernelType: event.type,
          },
          causationId: event.id,
        })
        void publishEvent({
          type: 'RealitySnapshotUpdated',
          source: 'reality-engine',
          payload: {
            generatedAt: result.store.snapshots[0]?.createdAt ?? result.store.updatedAt,
            eventCount: result.store.events.length,
          },
          causationId: event.id,
        })
        void publishEvent({
          type: 'SnapshotUpdated',
          source: 'reality-engine',
          payload: {
            kind: 'reality',
            generatedAt: result.store.snapshots[0]?.createdAt ?? result.store.updatedAt,
          },
          causationId: event.id,
        })
      },
    })
  }, [engine, registerSubscriber])

  const recordEvent = useCallback(async (input: RecordRealityEventInput) => {
    const { store: next, event, created } = await engine.recordEvent(input)
    setStore(next)
    if (created) {
      void publishEvent({
        type: 'RealityEventRecorded',
        source: 'reality-engine',
        payload: {
          eventId: event.id,
          eventType: event.eventType,
          domain: event.domain,
        },
      })
      void publishEvent({
        type: 'RealitySnapshotUpdated',
        source: 'reality-engine',
        payload: { generatedAt: next.updatedAt },
      })
      void publishEvent({
        type: 'SnapshotUpdated',
        source: 'reality-engine',
        payload: { kind: 'reality', generatedAt: next.updatedAt },
      })
      if (next.aggregations.some(a => a.eventIds.includes(event.id))) {
        void publishEvent({
          type: 'RealityAggregationCreated',
          source: 'reality-engine',
          payload: { eventId: event.id },
        })
      }
    }
    return event
  }, [engine])

  const ingestSignals = useCallback(async (signals: AdapterSignal[]) => {
    const inputs = signals.map(adapterSignalToRealityInput)
    const { store: next, events, createdCount } = await engine.recordEvents(inputs)
    setStore(next)
    if (createdCount > 0) {
      void publishEvent({
        type: 'RealityEventRecorded',
        source: 'reality-engine',
        payload: { batch: createdCount },
      })
      void publishEvent({
        type: 'RealitySnapshotUpdated',
        source: 'reality-engine',
        payload: { generatedAt: next.updatedAt },
      })
      void publishEvent({
        type: 'SnapshotUpdated',
        source: 'reality-engine',
        payload: { kind: 'reality', generatedAt: next.updatedAt },
      })
    }
    return events
  }, [engine])

  const dismissEvent = useCallback(async (eventId: string) => {
    const next = await engine.dismissEvent(eventId)
    setStore(next)
    void publishEvent({
      type: 'RealitySnapshotUpdated',
      source: 'reality-engine',
      payload: { generatedAt: next.updatedAt, dismissed: eventId },
    })
  }, [engine])

  const getToday = useCallback((specialistId?: SpecialistId) => {
    return engine.getToday(store, specialistId)
  }, [engine, store])

  const getTimeline = useCallback((specialistId?: SpecialistId) => {
    return engine.getTimeline(store, { specialistId, preferAggregations: true })
  }, [engine, store])

  const getSnapshotFn = useCallback((specialistId?: SpecialistId) => {
    return engine.getSnapshot(store, specialistId)
  }, [engine, store])

  const getRecentEvents = useCallback((limit = 25, specialistId?: SpecialistId) => {
    return engine.getRecentEvents(store, limit, specialistId)
  }, [engine, store])

  const getCurrentFocus = useCallback((specialistId?: SpecialistId) => {
    return engine.getCurrentFocus(store, specialistId)
  }, [engine, store])

  const getMomentum = useCallback((specialistId?: SpecialistId) => {
    return engine.getMomentum(store, specialistId)
  }, [engine, store])

  const getViewForSpecialist = useCallback((specialistId: SpecialistId) => {
    return engine.getSpecialistView(store, specialistId)
  }, [engine, store])

  const snapshot = useMemo(() => engine.getSnapshot(store), [engine, store])

  const value = useMemo<RealityContextValue>(() => ({
    ready,
    store,
    snapshot,
    recordEvent,
    ingestSignals,
    dismissEvent,
    refresh,
    getToday,
    getTimeline,
    getSnapshot: getSnapshotFn,
    getRecentEvents,
    getCurrentFocus,
    getMomentum,
    getViewForSpecialist,
  }), [
    ready, store, snapshot, recordEvent, ingestSignals, dismissEvent, refresh,
    getToday, getTimeline, getSnapshotFn, getRecentEvents, getCurrentFocus,
    getMomentum, getViewForSpecialist,
  ])

  return (
    <RealityContext.Provider value={value}>
      {children}
    </RealityContext.Provider>
  )
}

export function useReality(): RealityContextValue {
  const ctx = useContext(RealityContext)
  if (!ctx) throw new Error('useReality must be used within RealityProvider')
  return ctx
}
