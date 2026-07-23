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
import {
  IdentityEngine,
  createLocalFirstIdentityRepository,
  createLocalIdentityRepository,
  setIdentityEngineForTests,
  type DeclareFactInput,
  type IdentityDatastore,
  type IdentityEvidence,
  type IdentityFact,
  type IdentityHistoryEntry,
  type IdentitySpecialistView,
  type ObservationSignal,
  type ReviewFactInput,
  type SpecialistId,
} from '@/lib/identity'

interface IdentityContextValue {
  ready: boolean
  store: IdentityDatastore
  view: IdentitySpecialistView
  declareFact: (input: DeclareFactInput) => Promise<IdentityFact>
  reviewFact: (input: ReviewFactInput) => Promise<IdentityFact>
  ingestSignals: (signals: ObservationSignal[]) => Promise<IdentityFact[]>
  setEnabledSpecialists: (ids: SpecialistId[]) => Promise<void>
  markOnboardingComplete: (complete?: boolean) => Promise<void>
  getEvidenceForFact: (factId: string) => Promise<IdentityEvidence[]>
  recentHistory: IdentityHistoryEntry[]
  refresh: () => Promise<void>
  /** Read-only helper for specialists inside React tree. */
  getViewForSpecialist: (specialistId: SpecialistId) => IdentitySpecialistView
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

function createBrowserEngine(): IdentityEngine {
  const engine = new IdentityEngine(createLocalFirstIdentityRepository(createLocalIdentityRepository()))
  setIdentityEngineForTests(engine)
  return engine
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(() => createBrowserEngine())
  const [store, setStore] = useState<IdentityDatastore>(() => ({
    version: 1,
    facts: [],
    evidence: [],
    history: [],
    enabledSpecialists: [],
    onboardingComplete: false,
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
    const onOnline = () => {
      // Cloud flush is a no-op until authenticated Supabase identity repo is wired in-session.
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [refresh])

  const declareFact = useCallback(async (input: DeclareFactInput) => {
    const { store: next, fact } = await engine.declareFact(input)
    setStore(next)
    void publishEvent({
      type: 'IdentityFactDeclared',
      source: 'identity-engine',
      payload: { factId: fact.id, key: fact.key, category: fact.category },
    })
    return fact
  }, [engine])

  const reviewFact = useCallback(async (input: ReviewFactInput) => {
    const { store: next, fact } = await engine.reviewFact(input)
    setStore(next)
    const type =
      input.action === 'confirm'
        ? 'IdentityFactConfirmed'
        : input.action === 'reject'
          ? 'IdentityFactRejected'
          : 'IdentityUpdated'
    void publishEvent({
      type,
      source: 'identity-engine',
      payload: { factId: fact.id, action: input.action, key: fact.key },
    })
    return fact
  }, [engine])

  const ingestSignals = useCallback(async (signals: ObservationSignal[]) => {
    const { store: next, upserted } = await engine.ingestSignals(signals)
    setStore(next)
    for (const fact of upserted) {
      void publishEvent({
        type: 'IdentityObservationCreated',
        source: 'identity-engine',
        payload: { factId: fact.id, key: fact.key, confidence: fact.confidence },
      })
    }
    return upserted
  }, [engine])

  const setEnabledSpecialists = useCallback(async (ids: SpecialistId[]) => {
    const next = await engine.setEnabledSpecialists(ids)
    setStore(next)
  }, [engine])

  const markOnboardingComplete = useCallback(async (complete = true) => {
    const next = await engine.markOnboardingComplete(complete)
    setStore(next)
    void publishEvent({
      type: 'IdentityUpdated',
      source: 'identity-engine',
      payload: { onboardingComplete: complete },
    })
  }, [engine])

  const getEvidenceForFact = useCallback(async (factId: string) => {
    return engine.getEvidenceForFact(factId)
  }, [engine])

  const getViewForSpecialist = useCallback((specialistId: SpecialistId) => {
    return engine.getSpecialistView(store, specialistId)
  }, [engine, store])

  const view = useMemo(() => engine.getSpecialistView(store), [engine, store])
  const recentHistory = useMemo(
    () => [...store.history].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 25),
    [store.history],
  )

  const value = useMemo<IdentityContextValue>(() => ({
    ready,
    store,
    view,
    declareFact,
    reviewFact,
    ingestSignals,
    setEnabledSpecialists,
    markOnboardingComplete,
    getEvidenceForFact,
    recentHistory,
    refresh,
    getViewForSpecialist,
  }), [
    ready, store, view, declareFact, reviewFact, ingestSignals,
    setEnabledSpecialists, markOnboardingComplete, getEvidenceForFact,
    recentHistory, refresh, getViewForSpecialist,
  ])

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity must be used within IdentityProvider')
  return ctx
}
