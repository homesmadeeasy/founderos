import type { CreateSignalInput, Signal, SignalStore, UpdateSignalInput } from './signalTypes'
import { buildMockSignals } from './signalSources'
import { newSignalId, nowISO } from './signalUtils'

const STORAGE_KEY = 'founderos-signal-engine-v1'

function loadStore(): SignalStore {
  if (typeof window === 'undefined') return { signals: [], seeded: false }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { signals: [], seeded: false }
    const parsed = JSON.parse(raw) as Partial<SignalStore>
    return { signals: parsed.signals ?? [], seeded: parsed.seeded ?? false }
  } catch {
    return { signals: [], seeded: false }
  }
}

function persistStore(store: SignalStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function reloadSignalStore(): SignalStore {
  return loadStore()
}

export function ensureSignalSeed(): SignalStore {
  const store = loadStore()
  if (store.seeded) return store

  const now = nowISO()
  const mocks = buildMockSignals().map(m => ({
    ...m,
    id: m.id ?? newSignalId('mock'),
    processed: false,
    relatedMemoryIds: [],
    createdAt: now,
  }))

  const next: SignalStore = {
    signals: mocks,
    seeded: true,
  }
  persistStore(next)
  return next
}

export function getSignals(): Signal[] {
  return ensureSignalSeed().signals
}

export function getSignalById(id: string): Signal | null {
  return getSignals().find(s => s.id === id) ?? null
}

export function createSignal(input: CreateSignalInput): Signal {
  const store = ensureSignalSeed()
  const signal: Signal = {
    ...input,
    id: input.id ?? newSignalId(),
    processed: input.processed ?? false,
    relatedMemoryIds: input.relatedMemoryIds ?? [],
    createdAt: nowISO(),
  }
  persistStore({
    ...store,
    signals: [signal, ...store.signals.filter(s => s.id !== signal.id)].slice(0, 500),
  })
  return signal
}

export function updateSignal(id: string, updates: UpdateSignalInput): Signal | null {
  const store = loadStore()
  const idx = store.signals.findIndex(s => s.id === id)
  if (idx === -1) return null
  const updated = { ...store.signals[idx], ...updates }
  const next = [...store.signals]
  next[idx] = updated
  persistStore({ ...store, signals: next })
  return updated
}

export function deleteSignal(id: string): void {
  const store = loadStore()
  persistStore({ ...store, signals: store.signals.filter(s => s.id !== id) })
}

export function getRecentSignals(limit = 50): Signal[] {
  return getSignals()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

export function getSignalsBySource(source: Signal['source']): Signal[] {
  return getSignals().filter(s => s.source === source)
}

export function getSignalsByType(type: Signal['type']): Signal[] {
  return getSignals().filter(s => s.type === type)
}

export function getTodaySignals(): Signal[] {
  const today = nowISO().slice(0, 10)
  return getSignals().filter(s => s.timestamp.slice(0, 10) === today)
}

export function searchSignals(query: string, limit = 40): Signal[] {
  const q = query.trim().toLowerCase()
  if (!q) return getRecentSignals(limit)
  return getSignals()
    .filter(s =>
      s.title.toLowerCase().includes(q)
      || s.content.toLowerCase().includes(q)
      || s.source.includes(q)
      || s.type.includes(q),
    )
    .slice(0, limit)
}
