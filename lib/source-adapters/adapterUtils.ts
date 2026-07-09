import { classifySignal } from '@/lib/signal-engine/signalClassifier'
import type { CreateSignalInput, SignalSource } from '@/lib/signal-engine/signalTypes'
import { hoursAgo, nowISO, tomorrowAt } from '@/lib/signal-engine/signalUtils'

export function buildAdapterSignal(
  adapterId: string,
  source: SignalSource,
  input: Omit<CreateSignalInput, 'source' | 'type' | 'confidence'> & {
    syncKey: string
    type?: CreateSignalInput['type']
    confidence?: CreateSignalInput['confidence']
  },
): CreateSignalInput {
  const cls = classifySignal(source, input.title, input.content)
  return {
    ...input,
    source,
    type: input.type ?? cls.type,
    confidence: input.confidence ?? cls.confidence,
    metadata: {
      ...input.metadata,
      synced: true,
      adapterId,
      syncKey: input.syncKey,
      classificationReason: cls.reason,
    },
  }
}

export function todayAt(hour: number, minute = 0): string {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function daysFromNowAt(days: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export { hoursAgo, nowISO, tomorrowAt }
