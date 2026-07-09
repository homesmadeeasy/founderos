import type { AdapterConnectionState } from '@/lib/source-adapters/adapterTypes'
import type { SyncJob, SyncStore } from './syncTypes'
import { nowISO } from './syncUtils'

const STORAGE_KEY = 'founderos-sync-engine-v1'

function loadStore(): SyncStore {
  if (typeof window === 'undefined') {
    return { jobs: [], adapters: {} }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { jobs: [], adapters: {} }
    const parsed = JSON.parse(raw) as Partial<SyncStore>
    return {
      jobs: parsed.jobs ?? [],
      adapters: parsed.adapters ?? {},
      lastGlobalSyncAt: parsed.lastGlobalSyncAt,
    }
  } catch {
    return { jobs: [], adapters: {} }
  }
}

function persistStore(store: SyncStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function reloadSyncStore(): SyncStore {
  return loadStore()
}

export function getAllAdapterStates(): Record<string, AdapterConnectionState> {
  return loadStore().adapters
}

export function getAdapterState(adapterId: string): AdapterConnectionState | null {
  return loadStore().adapters[adapterId] ?? null
}

export function setAdapterState(
  adapterId: string,
  patch: Partial<AdapterConnectionState>,
): AdapterConnectionState {
  const store = loadStore()
  const existing = store.adapters[adapterId] ?? { adapterId, status: 'disconnected' as const }
  const next: AdapterConnectionState = { ...existing, ...patch, adapterId }
  persistStore({ ...store, adapters: { ...store.adapters, [adapterId]: next } })
  return next
}

export function saveSyncJob(job: SyncJob): SyncJob {
  const store = loadStore()
  persistStore({
    ...store,
    jobs: [job, ...store.jobs.filter(j => j.id !== job.id)].slice(0, 200),
  })
  return job
}

export function updateSyncJob(id: string, patch: Partial<SyncJob>): SyncJob | null {
  const store = loadStore()
  const idx = store.jobs.findIndex(j => j.id === id)
  if (idx === -1) return null
  const updated = { ...store.jobs[idx], ...patch }
  const jobs = [...store.jobs]
  jobs[idx] = updated
  persistStore({ ...store, jobs })
  return updated
}

export function getSyncHistory(limit = 50): SyncJob[] {
  return loadStore().jobs.slice(0, limit)
}

export function getLastSyncForSource(source: string): SyncJob | null {
  return loadStore().jobs.find(j => j.source === source && j.status === 'completed') ?? null
}

export function getLastGlobalSyncAt(): string | undefined {
  return loadStore().lastGlobalSyncAt
}

export function setLastGlobalSyncAt(iso: string): void {
  const store = loadStore()
  persistStore({ ...store, lastGlobalSyncAt: iso })
}
