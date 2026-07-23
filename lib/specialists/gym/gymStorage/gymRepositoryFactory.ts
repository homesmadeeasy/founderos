/**
 * Factory: local-first repository with optional cloud pending sync.
 */

import { createClient } from '@/lib/supabase/client'
import type { GymRepository } from './gymRepository'
import { createLocalGymRepository } from './localGymRepository'
import { createSupabaseGymRepository } from './supabaseGymRepository'
import {
  enqueueGymPendingOp,
  isBrowserOnline,
  listGymPendingOps,
  markGymPendingOpDone,
  markGymPendingOpFailed,
} from './gymPendingSync'
import { getGymStorageRepository } from './gymStorageRepository'
import type { ActiveWorkout, PersistStatus } from './gymStorageTypes'

export function getLocalGymRepository(): GymRepository {
  return createLocalGymRepository(getGymStorageRepository())
}

export async function tryGetSupabaseGymRepository(): Promise<GymRepository | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return createSupabaseGymRepository(supabase, user.id)
  } catch {
    return null
  }
}

export async function flushGymPendingOps(
  cloud: GymRepository | null = null,
): Promise<{ flushed: number; failed: number }> {
  const repo = cloud ?? await tryGetSupabaseGymRepository()
  if (!repo || !isBrowserOnline()) return { flushed: 0, failed: 0 }

  let flushed = 0
  let failed = 0
  for (const op of listGymPendingOps()) {
    try {
      if (op.type === 'save_active') {
        await repo.saveActiveWorkout(op.payload as ActiveWorkout | null)
      } else if (op.type === 'upsert_session') {
        await repo.updateWorkoutSession(op.payload as never)
      } else if (op.type === 'complete_session') {
        await repo.completeWorkoutSession(op.payload as never)
      } else if (op.type === 'save_profile') {
        await repo.saveProfile(op.payload as never)
      } else if (op.type === 'save_progression') {
        await repo.saveProgressionRecord(op.payload as never)
      }
      markGymPendingOpDone(op.id)
      flushed += 1
    } catch (err) {
      markGymPendingOpFailed(op.id, err instanceof Error ? err.message : 'sync failed')
      failed += 1
    }
  }
  return { flushed, failed }
}

/** Local write first, then enqueue cloud op. Returns persist status for UI. */
export async function persistActiveWorkoutWithSync(
  workout: ActiveWorkout | null,
): Promise<{ workout: ActiveWorkout | null; status: PersistStatus }> {
  const local = getLocalGymRepository()
  await local.saveActiveWorkout(workout)

  if (!isBrowserOnline()) {
    enqueueGymPendingOp('save_active', workout, workout ? `active:${workout.id}` : 'active:clear')
    return {
      workout: workout ? { ...workout, persistStatus: 'offline', lastPersistError: null } : null,
      status: 'offline',
    }
  }

  const cloud = await tryGetSupabaseGymRepository()
  if (!cloud) {
    return {
      workout: workout ? { ...workout, persistStatus: 'saved', lastPersistError: null } : null,
      status: 'saved',
    }
  }

  try {
    await cloud.saveActiveWorkout(workout)
    return {
      workout: workout ? { ...workout, persistStatus: 'saved', lastPersistError: null } : null,
      status: 'saved',
    }
  } catch (err) {
    enqueueGymPendingOp('save_active', workout, workout ? `active:${workout.id}` : 'active:clear')
    const message = err instanceof Error ? err.message : 'Cloud sync failed'
    return {
      workout: workout
        ? { ...workout, persistStatus: 'failed', lastPersistError: message }
        : null,
      status: 'failed',
    }
  }
}

export async function persistCompletedWorkoutWithSync(
  result: {
    session: import('./gymStorageTypes').WorkoutSessionRecord
    progressionRecords: import('./gymStorageTypes').ProgressionRecord[]
  },
): Promise<{ status: PersistStatus }> {
  const local = getLocalGymRepository()
  await local.completeWorkoutSession(result.session)
  for (const pr of result.progressionRecords) {
    await local.saveProgressionRecord(pr)
  }
  return syncCompletedWorkoutToCloud(result)
}

/** Cloud-only sync after local persistCompletedWorkout already succeeded. */
export async function syncCompletedWorkoutToCloud(
  result: {
    session: import('./gymStorageTypes').WorkoutSessionRecord
    progressionRecords: import('./gymStorageTypes').ProgressionRecord[]
  },
): Promise<{ status: PersistStatus }> {
  if (!isBrowserOnline()) {
    enqueueGymPendingOp('complete_session', result.session, `complete:${result.session.id}`)
    for (const pr of result.progressionRecords) {
      enqueueGymPendingOp('save_progression', pr, `prog:${pr.id}`)
    }
    return { status: 'offline' }
  }

  const cloud = await tryGetSupabaseGymRepository()
  if (!cloud) return { status: 'saved' }

  try {
    await cloud.completeWorkoutSession(result.session)
    for (const pr of result.progressionRecords) {
      await cloud.saveProgressionRecord(pr)
    }
    return { status: 'saved' }
  } catch {
    enqueueGymPendingOp('complete_session', result.session, `complete:${result.session.id}`)
    for (const pr of result.progressionRecords) {
      enqueueGymPendingOp('save_progression', pr, `prog:${pr.id}`)
    }
    return { status: 'failed' }
  }
}
