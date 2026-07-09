import type { AdapterCardConfig, AdapterConnectionState, SourceAdapter } from './adapterTypes'
import { createCalendarAdapter } from './calendarAdapter'
import { createCursorAdapter } from './cursorAdapter'
import { createEmailAdapter } from './emailAdapter'
import { createFileAdapter } from './fileAdapter'
import { createGithubAdapter } from './githubAdapter'
import { createHealthAdapter, createWatchAdapter } from './healthAdapter'
import { createVoiceAdapter } from './voiceAdapter'
import {
  getAdapterState,
  getAllAdapterStates,
  setAdapterState,
} from '@/lib/sync-engine/syncStorage'

const ADAPTER_IDS = [
  'calendar', 'health', 'github', 'cursor', 'email', 'file', 'voice', 'watch',
] as const

export type AdapterId = typeof ADAPTER_IDS[number]

function stateFor(id: string): AdapterConnectionState {
  return getAdapterState(id) ?? { adapterId: id, status: 'disconnected' }
}

function buildAdapter(
  id: string,
  factory: (
    getStatus: () => SourceAdapter['status'],
    getLastSync: () => string | undefined,
  ) => SourceAdapter,
): SourceAdapter {
  return factory(
    () => stateFor(id).status,
    () => stateFor(id).lastSyncedAt,
  )
}

export function getAllAdapters(): SourceAdapter[] {
  return [
    buildAdapter('calendar', createCalendarAdapter),
    buildAdapter('health', createHealthAdapter),
    buildAdapter('github', createGithubAdapter),
    buildAdapter('cursor', createCursorAdapter),
    buildAdapter('email', createEmailAdapter),
    buildAdapter('file', createFileAdapter),
    buildAdapter('voice', createVoiceAdapter),
    buildAdapter('watch', createWatchAdapter),
  ]
}

export function getAdapter(adapterId: string): SourceAdapter | null {
  return getAllAdapters().find(a => a.id === adapterId) ?? null
}

export function connectMockAdapter(adapterId: string): AdapterConnectionState {
  return setAdapterState(adapterId, { status: 'mock', errorMessage: undefined })
}

export function disconnectAdapter(adapterId: string): AdapterConnectionState {
  return setAdapterState(adapterId, { status: 'disconnected', errorMessage: undefined })
}

export function getAdapterConnections(): AdapterConnectionState[] {
  const states = getAllAdapterStates()
  return ADAPTER_IDS.map(id => states[id] ?? { adapterId: id, status: 'disconnected' })
}

export function getConnectedAdapterIds(): string[] {
  return getAdapterConnections()
    .filter(s => s.status === 'mock' || s.status === 'connected')
    .map(s => s.adapterId)
}

export const ADAPTER_CARDS: AdapterCardConfig[] = [
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Study blocks, gym sessions, and deadlines',
    adapterIds: ['calendar'],
    sources: ['calendar'],
  },
  {
    id: 'health',
    name: 'Health',
    description: 'Sleep, workouts, and recovery signals',
    adapterIds: ['health'],
    sources: ['health'],
  },
  {
    id: 'github-cursor',
    name: 'GitHub / Cursor',
    description: 'Commits, coding sessions, and build activity',
    adapterIds: ['github', 'cursor'],
    sources: ['github', 'cursor'],
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Reminders, invites, and important messages',
    adapterIds: ['email'],
    sources: ['email'],
  },
  {
    id: 'file',
    name: 'Files',
    description: 'Document and note changes',
    adapterIds: ['file'],
    sources: ['file'],
  },
  {
    id: 'voice',
    name: 'Voice',
    description: 'Hands-free capture (placeholder)',
    adapterIds: ['voice'],
    sources: ['voice'],
  },
  {
    id: 'watch',
    name: 'Watch',
    description: 'Activity rings, steps, and wearable data',
    adapterIds: ['watch'],
    sources: ['watch'],
  },
]

export function isSyncableStatus(status: AdapterConnectionState['status']): boolean {
  return status === 'mock' || status === 'connected'
}
