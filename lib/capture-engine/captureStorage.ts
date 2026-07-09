import type { CaptureSignal, CaptureStore } from './captureTypes'
import { todayISO } from './captureUtils'

const STORAGE_KEY = 'founderos-capture-engine-v1'

function loadStore(): CaptureStore {
  if (typeof window === 'undefined') return { signals: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { signals: [] }
    const parsed = JSON.parse(raw) as Partial<CaptureStore>
    return { signals: parsed.signals ?? [] }
  } catch {
    return { signals: [] }
  }
}

function persistStore(store: CaptureStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function reloadCaptureStore(): CaptureStore {
  return loadStore()
}

export function getAllSignals(): CaptureSignal[] {
  return loadStore().signals
}

export function getSignalById(id: string): CaptureSignal | null {
  return loadStore().signals.find(s => s.id === id) ?? null
}

export function saveSignal(signal: CaptureSignal): CaptureSignal {
  const store = loadStore()
  persistStore({
    signals: [
      signal,
      ...store.signals.filter(s => s.id !== signal.id),
    ].slice(0, 500),
  })
  return signal
}

export function updateSignal(id: string, updates: Partial<CaptureSignal>): CaptureSignal | null {
  const store = loadStore()
  const idx = store.signals.findIndex(s => s.id === id)
  if (idx === -1) return null
  const updated = { ...store.signals[idx], ...updates }
  const next = [...store.signals]
  next[idx] = updated
  persistStore({ signals: next })
  return updated
}

export function getSignalsByStatus(status: CaptureSignal['status']): CaptureSignal[] {
  return loadStore().signals.filter(s => s.status === status)
}

export function getTodaySignals(): CaptureSignal[] {
  const today = todayISO()
  return loadStore().signals.filter(s => s.timestamp.slice(0, 10) === today)
}

export function getRecentSignals(limit = 50): CaptureSignal[] {
  return loadStore().signals
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

export function searchSignals(query: string, limit = 30): CaptureSignal[] {
  const q = query.trim().toLowerCase()
  if (!q) return getRecentSignals(limit)
  return loadStore().signals
    .filter(s =>
      s.rawInput.toLowerCase().includes(q)
      || s.parsedTitle.toLowerCase().includes(q)
      || s.parsedContent.toLowerCase().includes(q)
      || s.classification.includes(q),
    )
    .slice(0, limit)
}

export function getUnprocessedCount(): number {
  return loadStore().signals.filter(s => s.status === 'new' || s.status === 'needs_review').length
}
