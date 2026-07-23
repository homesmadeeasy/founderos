import type {
  IdentityFact,
  IdentityHistoryChangeType,
  IdentityHistoryEntry,
} from './identityTypes'
import { newIdentityId, nowISO } from './identityUtils'

export function appendHistoryEntry(input: {
  factId: string
  changeType: IdentityHistoryChangeType
  previousSnapshot?: Partial<IdentityFact> | null
  nextSnapshot?: Partial<IdentityFact> | null
  reason?: string
  actor: 'user' | 'system' | 'inference'
}): IdentityHistoryEntry {
  return {
    id: newIdentityId(),
    factId: input.factId,
    changeType: input.changeType,
    previousSnapshot: input.previousSnapshot ?? null,
    nextSnapshot: input.nextSnapshot ?? null,
    reason: input.reason,
    at: nowISO(),
    actor: input.actor,
  }
}

export function historyForFact(
  entries: IdentityHistoryEntry[],
  factId: string,
): IdentityHistoryEntry[] {
  return entries
    .filter(e => e.factId === factId)
    .sort((a, b) => b.at.localeCompare(a.at))
}

export function recentHistory(
  entries: IdentityHistoryEntry[],
  limit = 20,
): IdentityHistoryEntry[] {
  return [...entries].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}

/** Snapshot fields safe for history (avoid huge blobs). */
export function factHistorySnapshot(fact: IdentityFact): Partial<IdentityFact> {
  return {
    id: fact.id,
    key: fact.key,
    kind: fact.kind,
    value: fact.value,
    displayValue: fact.displayValue,
    confidence: fact.confidence,
    status: fact.status,
    source: fact.source,
    updatedAt: fact.updatedAt,
  }
}
