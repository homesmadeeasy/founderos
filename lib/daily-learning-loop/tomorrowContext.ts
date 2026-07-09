import type { TomorrowContext, TomorrowContextData, TomorrowContextStore } from './dailyLoopTypes'
import { newEveningId, nowISO, tomorrowISO } from '@/lib/evening-review/eveningUtils'

const STORAGE_KEY = 'founderos-tomorrow-context-v1'

function loadStore(): TomorrowContextStore {
  if (typeof window === 'undefined') return { contexts: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { contexts: [] }
    const parsed = JSON.parse(raw) as Partial<TomorrowContextStore>
    return { contexts: parsed.contexts ?? [] }
  } catch {
    return { contexts: [] }
  }
}

function persistStore(store: TomorrowContextStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getTomorrowContext(date: string): TomorrowContext | null {
  return loadStore().contexts.find(c => c.date === date) ?? null
}

export function getTomorrowContextData(date: string): TomorrowContextData | null {
  return getTomorrowContext(date)?.context ?? null
}

export function saveTomorrowContext(
  sourceReviewDate: string,
  context: TomorrowContextData,
): TomorrowContext {
  const targetDate = tomorrowISO(sourceReviewDate)
  const record: TomorrowContext = {
    id: newEveningId('tomorrow'),
    date: targetDate,
    sourceReviewDate,
    context,
    createdAt: nowISO(),
  }
  const store = loadStore()
  persistStore({
    contexts: [
      record,
      ...store.contexts.filter(c => c.date !== targetDate),
    ].slice(0, 14),
  })
  return record
}

export function clearTomorrowContext(date: string): void {
  const store = loadStore()
  persistStore({ contexts: store.contexts.filter(c => c.date !== date) })
}
