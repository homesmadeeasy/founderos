import type { DailyContext, DailyContextStore } from './contextTypes'
import { todayISO } from './contextUtils'

const STORAGE_KEY = 'founderos-daily-context-v1'

function loadStore(): DailyContextStore {
  if (typeof window === 'undefined') return { contexts: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { contexts: [] }
    const parsed = JSON.parse(raw) as Partial<DailyContextStore>
    return { contexts: parsed.contexts ?? [] }
  } catch {
    return { contexts: [] }
  }
}

function persistStore(store: DailyContextStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getDailyContext(date = todayISO()): DailyContext | null {
  return loadStore().contexts.find(c => c.date === date) ?? null
}

export function saveDailyContext(context: DailyContext): DailyContext {
  const store = loadStore()
  const next = {
    contexts: [
      context,
      ...store.contexts.filter(c => c.date !== context.date),
    ].slice(0, 14),
  }
  persistStore(next)
  return context
}

export function clearDailyContext(date = todayISO()): void {
  const store = loadStore()
  persistStore({ contexts: store.contexts.filter(c => c.date !== date) })
}

export function reloadContextStore(): DailyContextStore {
  return loadStore()
}
