/**
 * Bounded pending-write queue for Gym cloud sync (v1).
 * Always write local first; enqueue ops for optional Supabase flush.
 */

import { GYM_PENDING_WRITES_KEY } from './gymStorageTypes'
import { newGymId } from './gymStorageRepository'

export type GymPendingOpType =
  | 'save_active'
  | 'upsert_session'
  | 'complete_session'
  | 'save_profile'
  | 'save_progression'

export interface GymPendingOp {
  id: string
  type: GymPendingOpType
  payload: unknown
  createdAt: string
  attempts: number
  lastError?: string
}

const MAX_QUEUE = 100

function readQueue(): GymPendingOp[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(GYM_PENDING_WRITES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GymPendingOp[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(ops: GymPendingOp[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(GYM_PENDING_WRITES_KEY, JSON.stringify(ops.slice(-MAX_QUEUE)))
}

export function enqueueGymPendingOp(
  type: GymPendingOpType,
  payload: unknown,
  stableId?: string,
): GymPendingOp {
  const ops = readQueue()
  const id = stableId ?? newGymId()
  const without = ops.filter(op => op.id !== id)
  const next: GymPendingOp = {
    id,
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  writeQueue([...without, next])
  return next
}

export function listGymPendingOps(): GymPendingOp[] {
  return readQueue()
}

export function markGymPendingOpDone(id: string): void {
  writeQueue(readQueue().filter(op => op.id !== id))
}

export function markGymPendingOpFailed(id: string, error: string): void {
  writeQueue(readQueue().map(op =>
    op.id === id ? { ...op, attempts: op.attempts + 1, lastError: error } : op,
  ))
}

export function clearGymPendingOpsForTests(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(GYM_PENDING_WRITES_KEY)
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}
