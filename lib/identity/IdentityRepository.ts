/**
 * IdentityRepository — local + optional Supabase implementations.
 * Specialists must not call repositories directly for writes; use IdentityEngine via context.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IdentityDatastore } from './identityTypes'
import {
  IDENTITY_PENDING_KEY,
  IDENTITY_STORAGE_KEY,
} from './identityTypes'
import { migrateIdentityDatastore, emptyIdentityDatastore } from './identitySchema'
import { nowISO } from './identityUtils'

export interface IdentityRepository {
  load(): Promise<IdentityDatastore>
  save(store: IdentityDatastore): Promise<void>
}

export function createLocalIdentityRepository(): IdentityRepository {
  return {
    async load() {
      if (typeof localStorage === 'undefined') return emptyIdentityDatastore()
      try {
        const raw = localStorage.getItem(IDENTITY_STORAGE_KEY)
        if (!raw) return emptyIdentityDatastore()
        return migrateIdentityDatastore(JSON.parse(raw))
      } catch {
        return emptyIdentityDatastore()
      }
    },
    async save(store) {
      if (typeof localStorage === 'undefined') return
      const next = { ...store, updatedAt: nowISO() }
      localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(next))
    },
  }
}

export function createSupabaseIdentityRepository(
  client: SupabaseClient,
  userId: string,
): IdentityRepository {
  return {
    async load() {
      const { data, error } = await client
        .from('identity_profiles')
        .select('datastore')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      if (!data?.datastore) return emptyIdentityDatastore()
      return migrateIdentityDatastore(data.datastore)
    },
    async save(store) {
      const next = { ...store, updatedAt: nowISO() }
      const { error } = await client.from('identity_profiles').upsert({
        user_id: userId,
        datastore: next,
        onboarding_complete: next.onboardingComplete,
        enabled_specialists: next.enabledSpecialists,
        updated_at: next.updatedAt,
      }, { onConflict: 'user_id' })
      if (error) throw error
    },
  }
}

interface PendingOp {
  id: string
  payload: IdentityDatastore
  createdAt: string
  attempts: number
  lastError?: string
}

function readPending(): PendingOp[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(IDENTITY_PENDING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PendingOp[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePending(ops: PendingOp[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(IDENTITY_PENDING_KEY, JSON.stringify(ops.slice(-50)))
}

export function enqueueIdentityCloudSave(store: IdentityDatastore): void {
  const ops = readPending().filter(op => op.id !== 'identity:full')
  ops.push({
    id: 'identity:full',
    payload: store,
    createdAt: nowISO(),
    attempts: 0,
  })
  writePending(ops)
}

export function clearIdentityPendingForTests(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(IDENTITY_PENDING_KEY)
}

export function resetIdentityStorageForTests(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(IDENTITY_STORAGE_KEY)
    localStorage.removeItem(IDENTITY_PENDING_KEY)
  }
}

/** Local-first repository: always write local; queue cloud when provided sync fails/offline. */
export function createLocalFirstIdentityRepository(
  local: IdentityRepository = createLocalIdentityRepository(),
  cloud: IdentityRepository | null = null,
): IdentityRepository {
  return {
    async load() {
      return local.load()
    },
    async save(store) {
      await local.save(store)
      if (!cloud) return
      const online = typeof navigator === 'undefined' || navigator.onLine !== false
      if (!online) {
        enqueueIdentityCloudSave(store)
        return
      }
      try {
        await cloud.save(store)
      } catch {
        enqueueIdentityCloudSave(store)
      }
    },
  }
}

export async function flushIdentityPendingOps(cloud: IdentityRepository): Promise<{ flushed: number; failed: number }> {
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

/** Test helper: in-memory repository. */
export function createMemoryIdentityRepository(
  initial: IdentityDatastore = emptyIdentityDatastore(),
): IdentityRepository & { peek: () => IdentityDatastore } {
  let store = initial
  return {
    async load() {
      return migrateIdentityDatastore(store)
    },
    async save(next) {
      store = { ...next, updatedAt: nowISO() }
    },
    peek() {
      return store
    },
  }
}