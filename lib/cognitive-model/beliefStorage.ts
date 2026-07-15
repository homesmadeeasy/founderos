import type { CognitiveStore, WorldModel } from './beliefTypes'
import { normalizeCognitiveStore } from './cognitiveNormalize'
import {
  compactCognitiveStore,
  cognitiveStoreSnapshot,
  getCognitiveStoreSizeBytes,
  pruneCognitiveStoreForBudget,
} from './cognitiveCompaction'
import { COGNITIVE_RETENTION } from './cognitiveRetention'
import {
  clearActiveMemoryStore,
  getActiveMemoryStore,
  getLastPersistedSnapshot,
  getStorageWarning,
  isPersistDisabled,
  setActiveMemoryStore,
  setLastPersistedSnapshot,
  setPersistDisabled,
  setStorageWarning,
  trackPersistInvocation,
} from './cognitiveMemory'
import { nowISO } from './cognitiveUtils'
import { createEmptyWorldModel } from './worldModel'
import { migrateCognitiveStoreToRealityV2 } from './realityReducer'

const STORAGE_KEY = 'founderos-cognitive-model-v1'

export type CognitiveStorageErrorCode = 'QuotaExceededError' | 'ParseError' | 'Unavailable' | null

export interface SaveCognitiveStoreResult {
  success: boolean
  sizeBytes: number
  pruned: boolean
  skipped: boolean
  errorCode: CognitiveStorageErrorCode
  warning?: string
}

function emptyStore(): CognitiveStore {
  return normalizeCognitiveStore({
    worldModel: createEmptyWorldModel(),
    timeline: [],
    lastKernelSyncAt: null,
  })
}

function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = (error as { name?: string }).name ?? ''
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
}

function tryPersist(json: string): void {
  window.localStorage.setItem(STORAGE_KEY, json)
}

function recoverOversizedRaw(raw: string): CognitiveStore {
  try {
    const parsed = JSON.parse(raw) as CognitiveStore
    const normalized = normalizeCognitiveStore(parsed)
    const compacted = pruneCognitiveStoreForBudget(normalized)
    return compacted.store
  } catch {
    return attemptPartialBeliefRecovery(raw)
  }
}

function attemptPartialBeliefRecovery(raw: string): CognitiveStore {
  try {
    const parsed = JSON.parse(raw) as { worldModel?: { beliefs?: unknown[] } }
    const beliefs = Array.isArray(parsed.worldModel?.beliefs) ? parsed.worldModel!.beliefs : []
    return normalizeCognitiveStore({
      worldModel: {
        ...createEmptyWorldModel(),
        beliefs: beliefs.slice(0, COGNITIVE_RETENTION.MAX_BELIEFS),
      },
      timeline: [],
      lastKernelSyncAt: null,
    })
  } catch {
    return emptyStore()
  }
}

export function loadCognitiveStore(): CognitiveStore {
  if (typeof window === 'undefined') {
    const memory = getActiveMemoryStore()
    return memory ?? emptyStore()
  }

  if (getActiveMemoryStore()) {
    return getActiveMemoryStore()!
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const fresh = emptyStore()
      setActiveMemoryStore(fresh)
      return fresh
    }

    const recovered = recoverOversizedRaw(raw)
    const compacted = compactCognitiveStore(recovered).store
    const migrated = migrateCognitiveStoreToRealityV2(compacted)
    setActiveMemoryStore(migrated)
    setLastPersistedSnapshot(cognitiveStoreSnapshot(migrated))

    const writeBackSize = getCognitiveStoreSizeBytes(migrated)
    if (raw.length > writeBackSize) {
      try {
        tryPersist(JSON.stringify(migrated))
        setLastPersistedSnapshot(cognitiveStoreSnapshot(migrated))
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[cognitive-model] Recovered store kept in memory; write-back failed.', error)
        }
      }
    }
    return migrated
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[cognitive-model] Failed to load cognitive store; using empty in-memory model.', error)
    }
    const fallback = emptyStore()
    setActiveMemoryStore(fallback)
    return fallback
  }
}

export function saveCognitiveStore(
  store: CognitiveStore,
  options?: { force?: boolean },
): SaveCognitiveStoreResult {
  const compacted = compactCognitiveStore(store)
  let working = compacted.store
  let pruned = compacted.pruned.evidence > 0
    || compacted.pruned.history > 0
    || compacted.pruned.timeline > 0

  setActiveMemoryStore(working)

  if (typeof window === 'undefined') {
    return { success: true, sizeBytes: getCognitiveStoreSizeBytes(working), pruned, skipped: false, errorCode: null }
  }

  if (isPersistDisabled() && !options?.force) {
    return {
      success: false,
      sizeBytes: getCognitiveStoreSizeBytes(working),
      pruned,
      skipped: true,
      errorCode: 'QuotaExceededError',
      warning: getStorageWarning() ?? 'Cognitive persistence disabled after quota exhaustion.',
    }
  }

  const snapshot = cognitiveStoreSnapshot(working)
  if (!options?.force && snapshot === getLastPersistedSnapshot()) {
    return {
      success: true,
      sizeBytes: getCognitiveStoreSizeBytes(working),
      pruned,
      skipped: true,
      errorCode: null,
    }
  }

  trackPersistInvocation()
  let sizeBytes = getCognitiveStoreSizeBytes(working)
  if (sizeBytes > COGNITIVE_RETENTION.STORAGE_BUDGET_BYTES) {
    const prunedResult = pruneCognitiveStoreForBudget(working)
    working = prunedResult.store
    pruned = true
    sizeBytes = getCognitiveStoreSizeBytes(working)
    setActiveMemoryStore(working)
  }

  const json = JSON.stringify(working)

  try {
    tryPersist(json)
    setLastPersistedSnapshot(cognitiveStoreSnapshot(working))
    setStorageWarning(null)
    setPersistDisabled(false)
    return { success: true, sizeBytes, pruned, skipped: false, errorCode: null }
  } catch (error) {
    if (!isQuotaError(error)) throw error

    const prunedResult = pruneCognitiveStoreForBudget(working)
    working = prunedResult.store
    sizeBytes = getCognitiveStoreSizeBytes(working)
    setActiveMemoryStore(working)

    try {
      tryPersist(JSON.stringify(working))
      setLastPersistedSnapshot(cognitiveStoreSnapshot(working))
      setStorageWarning('Cognitive storage was compacted after approaching browser quota.')
      return { success: true, sizeBytes, pruned: true, skipped: false, errorCode: 'QuotaExceededError' }
    } catch (retryError) {
      if (!isQuotaError(retryError)) throw retryError
      setPersistDisabled(true)
      const warning = 'Cognitive model is kept in memory only; browser storage is full. Use Settings → Compact cognitive storage.'
      setStorageWarning(warning)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[cognitive-model] ${warning}`)
      }
      return {
        success: false,
        sizeBytes,
        pruned: true,
        skipped: false,
        errorCode: 'QuotaExceededError',
        warning,
      }
    }
  }
}

export function updateWorldModel(
  store: CognitiveStore,
  worldModel: WorldModel,
  options?: { touch?: boolean },
): CognitiveStore {
  const touch = options?.touch ?? true
  return {
    ...store,
    worldModel: touch
      ? { ...worldModel, updatedAt: nowISO() }
      : worldModel,
  }
}

export function resetCognitiveStorage(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
  }
  clearActiveMemoryStore()
  setLastPersistedSnapshot(null)
  setPersistDisabled(false)
  setStorageWarning(null)
}

export function getCognitiveStorageKey(): string {
  return STORAGE_KEY
}
