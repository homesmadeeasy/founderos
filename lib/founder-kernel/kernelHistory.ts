import { summarizeEventPayload } from './kernelEvents'
import type { KernelExecution, KernelHistoryEntry } from './kernelTypes'
import { newHistoryId, nowISO } from './kernelUtils'

const STORAGE_KEY = 'founderos-kernel-history-v1'
const MAX_HISTORY = 500

interface KernelHistoryStore {
  entries: KernelHistoryEntry[]
}

function loadStore(): KernelHistoryStore {
  if (typeof window === 'undefined') return { entries: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { entries: [] }
    const parsed = JSON.parse(raw) as KernelHistoryStore
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] }
  } catch {
    return { entries: [] }
  }
}

function persistStore(store: KernelHistoryStore): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getKernelHistory(limit = 100): KernelHistoryEntry[] {
  return loadStore().entries.slice(0, limit)
}

export function recordKernelExecution(
  execution: KernelExecution,
  source: string,
  payload: Record<string, unknown>,
): KernelHistoryEntry {
  const entry: KernelHistoryEntry = {
    id: newHistoryId(),
    timestamp: nowISO(),
    eventType: execution.eventType,
    source,
    eventId: execution.eventId,
    subscriberCount: execution.subscriberCount,
    durationMs: execution.durationMs,
    success: execution.success,
    failureCount: execution.failureCount,
    payloadSummary: summarizeEventPayload(execution.eventType, payload),
  }

  const store = loadStore()
  store.entries = [entry, ...store.entries].slice(0, MAX_HISTORY)
  persistStore(store)
  return entry
}

export function clearKernelHistory(): void {
  persistStore({ entries: [] })
}
