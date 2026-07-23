/**
 * RealityRepository — local + optional Supabase implementations.
 * Specialists must not write via repositories; use RealityEngine / RealityContext.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { RealityDatastore } from './RealityTypes'
import { REALITY_PENDING_KEY, REALITY_STORAGE_KEY } from './RealityTypes'
import { emptyRealityDatastore, migrateRealityDatastore } from './RealitySchema'
import { nowISO } from './RealityUtils'

export interface RealityRepository {
  load(): Promise<RealityDatastore>
  save(store: RealityDatastore): Promise<void>
}

export function createLocalRealityRepository(): RealityRepository {
  return {
    async load() {
      if (typeof localStorage === 'undefined') return emptyRealityDatastore()
      try {
        const raw = localStorage.getItem(REALITY_STORAGE_KEY)
        if (!raw) return emptyRealityDatastore()
        return migrateRealityDatastore(JSON.parse(raw))
      } catch {
        return emptyRealityDatastore()
      }
    },
    async save(store) {
      if (typeof localStorage === 'undefined') return
      const next = { ...store, updatedAt: nowISO() }
      localStorage.setItem(REALITY_STORAGE_KEY, JSON.stringify(next))
    },
  }
}

export function createSupabaseRealityRepository(
  client: SupabaseClient,
  userId: string,
): RealityRepository {
  return {
    async load() {
      const { data, error } = await client
        .from('reality_profiles')
        .select('datastore')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      if (!data?.datastore) return emptyRealityDatastore()
      return migrateRealityDatastore(data.datastore)
    },
    async save(store) {
      const next = { ...store, updatedAt: nowISO() }
      const { error } = await client.from('reality_profiles').upsert({
        user_id: userId,
        datastore: next,
        updated_at: next.updatedAt,
      }, { onConflict: 'user_id' })
      if (error) throw error
    },
  }
}

interface PendingOp {
  id: string
  payload: RealityDatastore
  createdAt: string
  attempts: number
  lastError?: string
}

function readPending(): PendingOp[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(REALITY_PENDING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PendingOp[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePending(ops: PendingOp[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(REALITY_PENDING_KEY, JSON.stringify(ops.slice(-50)))
}

export function enqueueRealityCloudSave(store: RealityDatastore): void {
  const ops = readPending().filter(op => op.id !== 'reality:full')
  ops.push({
    id: 'reality:full',
    payload: store,
    createdAt: nowISO(),
    attempts: 0,
  })
  writePending(ops)
}

export function clearRealityPendingForTests(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(REALITY_PENDING_KEY)
}

export function resetRealityStorageForTests(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(REALITY_STORAGE_KEY)
    localStorage.removeItem(REALITY_PENDING_KEY)
  }
}

export function createLocalFirstRealityRepository(
  local: RealityRepository = createLocalRealityRepository(),
  cloud: RealityRepository | null = null,
): RealityRepository {
  return {
    async load() {
      return local.load()
    },
    async save(store) {
      await local.save(store)
      if (!cloud) return
      const online = typeof navigator === 'undefined' || navigator.onLine !== false
      if (!online) {
        enqueueRealityCloudSave(store)
        return
      }
      try {
        await cloud.save(store)
      } catch {
        enqueueRealityCloudSave(store)
      }
    },
  }
}

export async function flushRealityPendingOps(cloud: RealityRepository): Promise<{ flushed: number; failed: number }> {
  const online = typeof navigator === 'undefined' || navigator.onLine !== false
  if (!online) return { flushed: 0, failed: 0 }
  let flushed = 0
  let failed = 0
  const remaining: PendingOp[] = []
  for (const op of readPending()) {
    try {
      await cloud.save(op.payload)
      flushed += 1
    } catch (err) {
      failed += 1
      remaining.push({
        ...op,
        attempts: op.attempts + 1,
        lastError: err instanceof Error ? err.message : 'sync failed',
      })
    }
  }
  writePending(remaining)
  return { flushed, failed }
}

export function createMemoryRealityRepository(
  initial: RealityDatastore = emptyRealityDatastore(),
): RealityRepository & { peek: () => RealityDatastore } {
  let store = initial
  return {
    async load() {
      return migrateRealityDatastore(store)
    },
    async save(next) {
      store = { ...next, updatedAt: nowISO() }
    },
    peek() {
      return store
    },
  }
}
