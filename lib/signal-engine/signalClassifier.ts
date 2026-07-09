import type { SignalConfidence, SignalSource, SignalType } from './signalTypes'

export interface SignalClassification {
  type: SignalType
  confidence: SignalConfidence
  reason: string
}

const SOURCE_DEFAULTS: Partial<Record<SignalSource, SignalType>> = {
  manual_capture: 'idea',
  calendar: 'event',
  health: 'health',
  github: 'coding_session',
  email: 'message',
  cursor: 'coding_session',
  file: 'document',
  browser: 'activity',
  location: 'location',
  voice: 'activity',
  watch: 'health',
}

export function classifySignal(
  source: SignalSource,
  title: string,
  content: string,
): SignalClassification {
  const lower = `${title} ${content}`.toLowerCase()

  if (source === 'calendar' || lower.includes('meeting') || lower.includes('study block')) {
    return { type: 'event', confidence: 'high', reason: 'Calendar/event pattern.' }
  }

  if (source === 'health' || lower.includes('sleep') || lower.includes('hours sleep')) {
    return { type: 'health', confidence: 'high', reason: 'Health/sleep signal.' }
  }

  if (
    (source === 'github' || source === 'cursor')
    && (lower.includes('coding') || lower.includes('founderos') || lower.includes('session'))
  ) {
    return { type: 'coding_session', confidence: 'high', reason: 'Coding session detected.' }
  }

  if (lower.includes('workout') || lower.includes('train') || lower.includes('gym')) {
    return { type: 'workout', confidence: source === 'watch' ? 'high' : 'medium', reason: 'Workout pattern.' }
  }

  if (source === 'email' || lower.includes('reminder') || lower.includes('school')) {
    return { type: 'reminder', confidence: 'medium', reason: 'Message/reminder pattern.' }
  }

  if (source === 'manual_capture' || lower.includes('idea')) {
    return { type: 'idea', confidence: 'medium', reason: 'Manual capture / idea.' }
  }

  const defaultType = SOURCE_DEFAULTS[source] ?? 'activity'
  return { type: defaultType, confidence: 'medium', reason: `Default for source: ${source}` }
}

export function isImportantSignal(type: SignalType, confidence: SignalConfidence): boolean {
  if (confidence === 'high') return true
  return ['health', 'workout', 'coding_session', 'event', 'reminder', 'idea'].includes(type)
}
