import type { SignalSource } from '@/lib/signal-engine/signalTypes'
import type { AdapterConnectionState } from '@/lib/source-adapters/adapterTypes'

export type SyncJobStatus = 'running' | 'completed' | 'failed'

export interface SyncJob {
  id: string
  adapterId: string
  source: SignalSource
  status: SyncJobStatus
  startedAt: string
  completedAt?: string
  signalsCreated: number
  error?: string
}

export interface SyncStore {
  jobs: SyncJob[]
  adapters: Record<string, AdapterConnectionState>
  lastGlobalSyncAt?: string
}

export interface SyncResult {
  job: SyncJob
  signalsCreated: number
  skipped: number
}
