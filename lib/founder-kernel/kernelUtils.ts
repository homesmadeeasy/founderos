import { newDecisionId } from '@/lib/decision-engine/decisionUtils'
import type { FounderEvent, FounderEventStatus } from './kernelTypes'

export function newEventId(): string {
  return newDecisionId('evt')
}

export function newHistoryId(): string {
  return newDecisionId('khist')
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function safeHandlerName(name: string): string {
  return name.trim() || 'anonymous-subscriber'
}

export function transitionEventStatus(
  current: FounderEventStatus,
  next: FounderEventStatus,
): FounderEventStatus {
  const order: FounderEventStatus[] = ['created', 'queued', 'dispatching', 'completed', 'archived', 'failed']
  const currentIdx = order.indexOf(current)
  const nextIdx = order.indexOf(next)
  if (nextIdx < currentIdx && next !== 'failed') return current
  return next
}

export function cloneEvent(event: FounderEvent): FounderEvent {
  return {
    ...event,
    payload: { ...event.payload },
    metadata: event.metadata ? { ...event.metadata } : undefined,
  }
}
