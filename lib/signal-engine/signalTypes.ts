/**
 * Connected Reality — Signal Engine types.
 */

export type SignalSource =
  | 'manual_capture'
  | 'calendar'
  | 'health'
  | 'github'
  | 'email'
  | 'cursor'
  | 'file'
  | 'browser'
  | 'location'
  | 'voice'
  | 'watch'
  | 'future_api'

export type SignalType =
  | 'activity'
  | 'event'
  | 'health'
  | 'task'
  | 'idea'
  | 'message'
  | 'workout'
  | 'coding_session'
  | 'document'
  | 'reminder'
  | 'location'
  | 'system'

export type SignalConfidence = 'low' | 'medium' | 'high'

export interface Signal {
  id: string
  source: SignalSource
  type: SignalType
  title: string
  content: string
  timestamp: string
  confidence: SignalConfidence
  processed: boolean
  relatedObjectIds: string[]
  relatedMemoryIds: string[]
  metadata: Record<string, unknown>
  createdAt: string
}

export type CreateSignalInput = Omit<
  Signal,
  'id' | 'processed' | 'relatedMemoryIds' | 'createdAt'
> & {
  id?: string
  processed?: boolean
  relatedMemoryIds?: string[]
}

export type UpdateSignalInput = Partial<Omit<Signal, 'id' | 'createdAt'>>

export interface SignalStore {
  signals: Signal[]
  seeded: boolean
}

export const SIGNAL_SOURCE_LABEL: Record<SignalSource, string> = {
  manual_capture: 'Manual capture',
  calendar: 'Calendar',
  health: 'Health',
  github: 'GitHub',
  email: 'Email',
  cursor: 'Cursor',
  file: 'File',
  browser: 'Browser',
  location: 'Location',
  voice: 'Voice',
  watch: 'Watch',
  future_api: 'API',
}

export const SIGNAL_TYPE_LABEL: Record<SignalType, string> = {
  activity: 'Activity',
  event: 'Event',
  health: 'Health',
  task: 'Task',
  idea: 'Idea',
  message: 'Message',
  workout: 'Workout',
  coding_session: 'Coding session',
  document: 'Document',
  reminder: 'Reminder',
  location: 'Location',
  system: 'System',
}
