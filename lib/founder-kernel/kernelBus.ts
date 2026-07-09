import { dispatchEvent } from './kernelDispatcher'
import { recordKernelExecution, getKernelHistory } from './kernelHistory'
import type {
  FounderEvent,
  KernelExecution,
  KernelHistoryEntry,
  KernelSubscriber,
  PublishEventInput,
} from './kernelTypes'
import { markEventArchived } from './kernelLifecycle'
import { newEventId, nowISO } from './kernelUtils'

type KernelChangeListener = () => void

class FounderKernelBus {
  private subscribers = new Map<string, KernelSubscriber>()
  private listeners = new Set<KernelChangeListener>()
  private lastExecution: KernelExecution | null = null
  private queue: FounderEvent[] = []
  private dispatching = false

  subscribe(subscriber: KernelSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber)
    return () => {
      this.unsubscribe(subscriber.id)
    }
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id)
  }

  getSubscribers(): KernelSubscriber[] {
    return Array.from(this.subscribers.values())
  }

  onChange(listener: KernelChangeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getLastExecution(): KernelExecution | null {
    return this.lastExecution
  }

  getHistory(limit = 100): KernelHistoryEntry[] {
    return getKernelHistory(limit)
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch {
        // Listener failures must not break the bus.
      }
    }
  }

  async publish(input: PublishEventInput): Promise<KernelExecution> {
    const event: FounderEvent = {
      id: newEventId(),
      type: input.type,
      source: input.source,
      timestamp: nowISO(),
      payload: input.payload ?? {},
      metadata: input.metadata,
      correlationId: input.correlationId,
      causationId: input.causationId,
      status: 'created',
    }

    this.queue.push(event)

    if (this.dispatching) {
      return this.lastExecution ?? emptyExecution(event.type)
    }

    this.dispatching = true
    let last = emptyExecution(event.type)

    try {
      while (this.queue.length > 0) {
        const queued = this.queue.shift()!
        const { event: completed, execution } = await dispatchEvent(
          queued,
          this.getSubscribers(),
        )
        recordKernelExecution(execution, completed.source, completed.payload)
        this.lastExecution = execution
        last = execution
        markEventArchived(completed)
        this.notify()
      }
    } finally {
      this.dispatching = false
    }

    return last
  }
}

function emptyExecution(eventType: FounderEvent['type']): KernelExecution {
  return {
    eventId: 'none',
    eventType,
    startedAt: nowISO(),
    finishedAt: nowISO(),
    durationMs: 0,
    subscriberCount: 0,
    subscriberResults: [],
    success: true,
    failureCount: 0,
  }
}

let busInstance: FounderKernelBus | null = null

export function getKernelBus(): FounderKernelBus {
  if (!busInstance) {
    busInstance = new FounderKernelBus()
  }
  return busInstance
}

export function resetKernelBusForTests(): void {
  busInstance = null
}

export type { FounderKernelBus }
