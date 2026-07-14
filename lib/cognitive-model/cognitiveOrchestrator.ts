import type { CognitiveStore, RawCognitiveInput, NormalizedCognitiveInput } from './beliefTypes'
import {
  loadCognitiveStore,
  saveCognitiveStore,
  updateWorldModel,
  type SaveCognitiveStoreResult,
} from './beliefStorage'
import { setActiveMemoryStore, getActiveMemoryStore } from './cognitiveMemory'
import { cognitiveStoreSnapshot } from './cognitiveCompaction'
import { createEvidence } from './beliefEvidence'
import { updateBelief, createBelief, mergeBeliefs } from './beliefUpdates'
import { appendTimeline } from './beliefTimeline'
import { reconcileWorldModel } from './worldModel'
import { normalizeCognitiveInput, isEmptyCognitiveInput } from './cognitiveInputNormalize'
import {
  adaptKnowledgeRecord,
  adaptMemoryRecord,
  adaptOutcomeRecord,
  adaptSignalRecord,
} from './cognitiveInputNormalize'
import { truncateText } from './cognitiveUtils'
import type { FounderEvent } from '@/lib/founder-kernel/kernelTypes'

export interface SyncCognitiveModelOptions {
  force?: boolean
  skipPersist?: boolean
}

let reconciling = false

export function isCognitiveReconcileInProgress(): boolean {
  return reconciling
}

export function shouldDeferEmptyReconcile(store: CognitiveStore, input: NormalizedCognitiveInput): boolean {
  return isEmptyCognitiveInput(input) && store.worldModel.beliefs.length > 0
}

export function reconcileCognitiveModel(
  input?: RawCognitiveInput | null,
  options?: SyncCognitiveModelOptions,
): CognitiveStore {
  if (reconciling && !options?.force) {
    return getCognitiveStore()
  }

  reconciling = true
  try {
    const normalized = normalizeCognitiveInput(input)
    const store = getCognitiveStore()

    if (!options?.force && shouldDeferEmptyReconcile(store, normalized)) {
      return store
    }

    const worldModel = reconcileWorldModel(store.worldModel, normalized)
    if (!options?.force) {
      const candidate: CognitiveStore = {
        ...updateWorldModel(store, worldModel, { touch: false }),
        lastKernelSyncAt: store.lastKernelSyncAt,
      }
      if (cognitiveStoreSnapshot(candidate) === cognitiveStoreSnapshot(store)) {
        return store
      }
    }

    const changed = cognitiveStoreSnapshot({
      ...store,
      worldModel,
    }) !== cognitiveStoreSnapshot(store)

    const next: CognitiveStore = {
      ...updateWorldModel(store, worldModel, { touch: changed }),
      lastKernelSyncAt: changed ? new Date().toISOString() : store.lastKernelSyncAt,
    }
    setActiveMemoryStore(next)
    return next
  } finally {
    reconciling = false
  }
}

export function syncCognitiveModel(
  input?: RawCognitiveInput | null,
  options?: SyncCognitiveModelOptions,
): CognitiveStore {
  const next = reconcileCognitiveModel(input, options)
  if (!options?.skipPersist) {
    persistCognitiveStore(next, options)
  }
  return next
}

export function persistCognitiveStore(
  store: CognitiveStore,
  options?: { force?: boolean },
): SaveCognitiveStoreResult {
  const result = saveCognitiveStore(store, options)
  if (!result.success && result.warning && process.env.NODE_ENV === 'development') {
    console.warn(`[cognitive-model] ${result.warning}`)
  }
  return result
}

export function processConversationAnswer(
  answer: string,
  beliefKey?: string,
): CognitiveStore {
  const store = getCognitiveStore()
  let beliefs = [...store.worldModel.beliefs]
  const safeAnswer = truncateText(answer, 200)

  const evidence = createEvidence('conversation', 'User answer', safeAnswer, true, 0.7)
  const target = beliefs.find((b) =>
    beliefKey ? b.statement.toLowerCase().includes(beliefKey.toLowerCase()) : false,
  ) ?? beliefs.find((b) => b.confidence < 55)

  if (target) {
    const result = updateBelief(target, {
      evidence,
      reason: `User answered: "${truncateText(answer, 80)}"`,
      triggerEvent: 'ConversationAnswered',
    })
    beliefs = beliefs.map((b) => (b.id === result.belief.id ? result.belief : b))
  } else {
    beliefs = mergeBeliefs(beliefs, [
      createBelief(safeAnswer, 'founder', 'user_statement', 55, 'medium'),
    ])
  }

  const worldModel = reconcileWorldModel(
    { ...store.worldModel, beliefs },
    normalizeCognitiveInput({ conversationBeliefs: [] }),
  )
  let next = updateWorldModel(store, worldModel)
  next = appendTimeline(next, {
    type: 'belief_updated',
    title: 'Belief updated from conversation',
    detail: truncateText(answer, 120),
    relatedIds: beliefs.map((b) => b.id).slice(0, 3),
  })
  setActiveMemoryStore(next)
  persistCognitiveStore(next)
  return next
}

function rawInputFromKernelEvent(event: FounderEvent): RawCognitiveInput | null {
  switch (event.type) {
    case 'MemoryCreated': {
      const memory = adaptMemoryRecord(event.payload.memory)
      return memory ? { memories: [memory] } : null
    }
    case 'OutcomeRecorded': {
      const outcome = adaptOutcomeRecord(event.payload.outcome ?? event.payload)
      return outcome ? { outcomes: [outcome] } : null
    }
    case 'SignalCreated':
    case 'SignalProcessed': {
      const signal = adaptSignalRecord(event.payload.signal)
      return signal ? { signals: [signal] } : null
    }
    case 'KnowledgeCreated': {
      const knowledge = adaptKnowledgeRecord(event.payload.knowledge)
      return knowledge ? { knowledge: [knowledge] } : null
    }
    case 'DecisionGenerated': {
      const decision = event.payload.decision
      if (!decision || typeof decision !== 'object') return null
      const item = decision as Record<string, unknown>
      const primary = item.primaryDecision
      const title = primary && typeof primary === 'object'
        ? String((primary as Record<string, unknown>).title ?? '')
        : ''
      const explanation = typeof item.explanation === 'string' ? item.explanation : ''
      return { decisionSummary: title || truncateText(explanation, 120) }
    }
    default:
      return null
  }
}

export function handleKernelEventForCognitive(event: FounderEvent): CognitiveStore | null {
  if (event.type === 'CognitiveModelUpdated') return null
  if (reconciling) return null

  if (event.type === 'ConversationAnswered') {
    const answer = String(event.payload.answer ?? '')
    if (!answer) return null
    return processConversationAnswer(answer, String(event.payload.beliefKey ?? ''))
  }

  const raw = rawInputFromKernelEvent(event)
  if (!raw) return null

  const store = getCognitiveStore()
  const worldModel = reconcileWorldModel(store.worldModel, normalizeCognitiveInput(raw))
  let next = updateWorldModel(store, worldModel)
  next = appendTimeline(next, {
    type: 'kernel',
    title: `Kernel: ${event.type}`,
    detail: event.type,
    relatedIds: [],
  })
  setActiveMemoryStore(next)
  persistCognitiveStore(next)
  return next
}

export function getCognitiveStore(): CognitiveStore {
  return getActiveMemoryStore() ?? loadCognitiveStore()
}

export function setCognitiveStore(store: CognitiveStore): void {
  setActiveMemoryStore(store)
}
