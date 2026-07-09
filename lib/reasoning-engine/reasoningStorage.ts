import type { DailyReasoningOutput, ReasoningStore } from './reasoningTypes'
import { todayISO } from './reasoningUtils'

const STORAGE_KEY = 'founderos-reasoning-engine-v1'

function loadStore(): ReasoningStore {
  if (typeof window === 'undefined') return { outputs: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { outputs: [] }
    const parsed = JSON.parse(raw) as Partial<ReasoningStore>
    return { outputs: parsed.outputs ?? [] }
  } catch {
    return { outputs: [] }
  }
}

function persistStore(store: ReasoningStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getDailyReasoning(date = todayISO()): DailyReasoningOutput | null {
  return loadStore().outputs.find(o => o.date === date) ?? null
}

export function saveDailyReasoning(output: DailyReasoningOutput): DailyReasoningOutput {
  const store = loadStore()
  persistStore({
    outputs: [
      output,
      ...store.outputs.filter(o => o.date !== output.date),
    ].slice(0, 14),
  })
  return output
}

export function clearDailyReasoning(date = todayISO()): void {
  const store = loadStore()
  persistStore({ outputs: store.outputs.filter(o => o.date !== date) })
}
