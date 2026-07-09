import { runAllSyncs, type SyncRunnerDeps } from './syncRunner'
import type { SyncResult } from './syncTypes'

/** Placeholder scheduler — runs a one-shot mock sync. Future: interval / cron hooks. */
export async function scheduleMockSync(deps?: SyncRunnerDeps): Promise<SyncResult[]> {
  return runAllSyncs(deps)
}
