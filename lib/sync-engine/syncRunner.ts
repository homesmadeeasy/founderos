import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import { ingestSignal } from '@/lib/signal-engine/signalPipeline'
import { getSignals } from '@/lib/signal-engine/signalStorage'
import type { CreateSignalInput } from '@/lib/signal-engine/signalTypes'
import { getAdapter, getConnectedAdapterIds, isSyncableStatus } from '@/lib/source-adapters/adapterRegistry'
import {
  getAdapterState,
  getLastSyncForSource,
  getSyncHistory,
  saveSyncJob,
  setAdapterState,
  setLastGlobalSyncAt,
  updateSyncJob,
} from './syncStorage'
import type { SyncJob, SyncResult } from './syncTypes'
import { newSyncId, nowISO } from './syncUtils'

export interface SyncRunnerDeps {
  recordMemory?: (input: CreateMemoryInput) => MemoryRecord | null
}

function hasRecentSyncKey(syncKey: string): boolean {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  return getSignals().some(s => {
    const key = s.metadata?.syncKey
    if (key !== syncKey) return false
    return new Date(s.timestamp).getTime() > cutoff
  })
}

function hasRecentCalendarDuplicate(input: CreateSignalInput): boolean {
  if (input.source !== 'calendar') return false
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const existing = getSignals().filter(s => new Date(s.timestamp).getTime() > cutoff)

  const eventId = input.metadata?.calendarEventId as string | undefined
  if (eventId) {
    return existing.some(s => s.metadata?.calendarEventId === eventId)
  }

  const start = String(input.metadata?.start ?? input.timestamp).slice(0, 16)
  return existing.some(s => {
    if (s.source !== 'calendar') return false
    if (s.title !== input.title) return false
    const sStart = String(s.metadata?.start ?? s.timestamp).slice(0, 16)
    return sStart === start
  })
}

function ingestSyncSignals(inputs: CreateSignalInput[], deps?: SyncRunnerDeps): { created: number; skipped: number } {
  let created = 0
  let skipped = 0
  const memoryDeps = deps?.recordMemory ? { recordMemory: deps.recordMemory } : undefined

  for (const input of inputs) {
    const syncKey = input.metadata?.syncKey as string | undefined
    if (syncKey && hasRecentSyncKey(syncKey)) {
      skipped += 1
      continue
    }
    if (hasRecentCalendarDuplicate(input)) {
      skipped += 1
      continue
    }
    ingestSignal(input, memoryDeps)
    created += 1
  }

  return { created, skipped }
}

export async function runSync(adapterId: string, deps?: SyncRunnerDeps): Promise<SyncResult> {
  const adapter = getAdapter(adapterId)
  const state = getAdapterState(adapterId)

  if (!adapter || !state || !isSyncableStatus(state.status)) {
    const failedJob: SyncJob = {
      id: newSyncId(),
      adapterId,
      source: adapter?.source ?? 'future_api',
      status: 'failed',
      startedAt: nowISO(),
      completedAt: nowISO(),
      signalsCreated: 0,
      error: 'Adapter not connected. Use Connect mock in Settings.',
    }
    saveSyncJob(failedJob)
    return { job: failedJob, signalsCreated: 0, skipped: 0 }
  }

  const job: SyncJob = {
    id: newSyncId(),
    adapterId,
    source: adapter.source,
    status: 'running',
    startedAt: nowISO(),
    signalsCreated: 0,
  }
  saveSyncJob(job)

  try {
    const canConnect = await adapter.testConnection()
    if (!canConnect) {
      throw new Error('Connection test failed.')
    }

    const inputs = await adapter.sync()
    const { created, skipped } = ingestSyncSignals(inputs, deps)
    const completedAt = nowISO()

    const completed = updateSyncJob(job.id, {
      status: 'completed',
      completedAt,
      signalsCreated: created,
    })!

    setAdapterState(adapterId, {
      lastSyncedAt: completedAt,
      errorMessage: undefined,
    })

    return { job: completed, signalsCreated: created, skipped }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    const failed = updateSyncJob(job.id, {
      status: 'failed',
      completedAt: nowISO(),
      error: message,
    })!
    setAdapterState(adapterId, { status: 'error', errorMessage: message })
    return { job: failed, signalsCreated: 0, skipped: 0 }
  }
}

export async function runAllSyncs(deps?: SyncRunnerDeps): Promise<SyncResult[]> {
  const ids = getConnectedAdapterIds()
  const results: SyncResult[] = []

  for (const adapterId of ids) {
    results.push(await runSync(adapterId, deps))
  }

  if (results.some(r => r.job.status === 'completed')) {
    setLastGlobalSyncAt(nowISO())
  }

  return results
}

export { getSyncHistory, getLastSyncForSource }
