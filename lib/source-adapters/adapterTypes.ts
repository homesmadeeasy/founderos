import type { CreateSignalInput, SignalSource } from '@/lib/signal-engine/signalTypes'

export type AdapterStatus = 'disconnected' | 'connected' | 'error' | 'mock'

export interface SourceAdapter {
  id: string
  name: string
  source: SignalSource
  status: AdapterStatus
  lastSyncedAt?: string
  errorMessage?: string
  sync(): Promise<CreateSignalInput[]>
  testConnection(): Promise<boolean>
}

export interface AdapterConnectionState {
  adapterId: string
  status: AdapterStatus
  lastSyncedAt?: string
  errorMessage?: string
}

export interface AdapterCardConfig {
  id: string
  name: string
  description: string
  adapterIds: string[]
  sources: SignalSource[]
}
