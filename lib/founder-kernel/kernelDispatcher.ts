import type {
  FounderEvent,
  KernelExecution,
  KernelSubscriber,
  KernelSubscriberResult,
} from './kernelTypes'
import { markEventCompleted, markEventDispatching, markEventFailed, markEventQueued } from './kernelLifecycle'
import { nowISO } from './kernelUtils'

export function findSubscribersForEvent(
  subscribers: KernelSubscriber[],
  eventType: FounderEvent['type'],
): KernelSubscriber[] {
  return subscribers
    .filter(sub => sub.subscribedEvents.includes(eventType))
    .sort((a, b) => a.priority - b.priority)
}

export async function dispatchEvent(
  event: FounderEvent,
  subscribers: KernelSubscriber[],
): Promise<{ event: FounderEvent; execution: KernelExecution }> {
  let current = markEventQueued(event)
  current = markEventDispatching(current)
  const startedAt = nowISO()
  const startMs = Date.now()

  const matched = findSubscribersForEvent(subscribers, event.type)
  const subscriberResults: KernelSubscriberResult[] = []

  for (const subscriber of matched) {
    const subStart = Date.now()
    try {
      await subscriber.handler(current)
      subscriberResults.push({
        subscriberId: subscriber.id,
        subscriberName: subscriber.name,
        status: 'success',
        durationMs: Date.now() - subStart,
      })
    } catch (error) {
      subscriberResults.push({
        subscriberId: subscriber.id,
        subscriberName: subscriber.name,
        status: 'failure',
        durationMs: Date.now() - subStart,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const failureCount = subscriberResults.filter(r => r.status === 'failure').length
  const finishedAt = nowISO()
  const durationMs = Date.now() - startMs
  const finalEvent = failureCount > 0 && matched.length === failureCount
    ? markEventFailed(current)
    : markEventCompleted(current)

  const execution: KernelExecution = {
    eventId: event.id,
    eventType: event.type,
    startedAt,
    finishedAt,
    durationMs,
    subscriberCount: matched.length,
    subscriberResults,
    success: failureCount === 0,
    failureCount,
  }

  return { event: finalEvent, execution }
}
