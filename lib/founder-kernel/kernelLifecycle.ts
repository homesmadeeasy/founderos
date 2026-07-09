import type { FounderEvent, FounderEventStatus } from './kernelTypes'
import { transitionEventStatus } from './kernelUtils'

export function markEventQueued(event: FounderEvent): FounderEvent {
  return { ...event, status: transitionEventStatus(event.status, 'queued') }
}

export function markEventDispatching(event: FounderEvent): FounderEvent {
  return { ...event, status: transitionEventStatus(event.status, 'dispatching') }
}

export function markEventCompleted(event: FounderEvent): FounderEvent {
  return { ...event, status: transitionEventStatus(event.status, 'completed') }
}

export function markEventFailed(event: FounderEvent): FounderEvent {
  return { ...event, status: 'failed' }
}

export function markEventArchived(event: FounderEvent): FounderEvent {
  return { ...event, status: 'archived' }
}

export function isTerminalStatus(status: FounderEventStatus): boolean {
  return status === 'completed' || status === 'archived' || status === 'failed'
}
