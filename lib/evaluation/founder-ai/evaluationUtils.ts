import type { CognitiveStore } from '@/lib/cognitive-model/beliefTypes'
import { normalizeCognitiveStore } from '@/lib/cognitive-model/cognitiveNormalize'
import { createEmptyWorldModel } from '@/lib/cognitive-model/worldModel'
import { migrateCognitiveStoreToRealityV2 } from '@/lib/cognitive-model/realityReducer'
import { clearActiveMemoryStore, setActiveMemoryStore } from '@/lib/cognitive-model/cognitiveMemory'
import { setCognitiveStore } from '@/lib/cognitive-model/cognitiveOrchestrator'
import type { ConversationSession } from '@/lib/conversation/conversationTypes'
import type { FounderBaseInput } from '@/lib/specialists/founder/founderInputBuilder'
import { mergeFounderInputWithWorldModel } from '@/lib/specialists/founder/founderInputBuilder'
import { buildFounderSnapshot } from '@/lib/specialists/founder/founderUtils'
import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import { evaluationBaseInput } from './evaluationFixtures'

export const EVAL_SESSION_ID = 'eval-session'

export function createEmptyEvalStore(): CognitiveStore {
  return migrateCognitiveStoreToRealityV2(normalizeCognitiveStore({
    worldModel: createEmptyWorldModel(),
    timeline: [],
    lastKernelSyncAt: null,
  }))
}

export function simulatePageRefresh(store: CognitiveStore): CognitiveStore {
  const raw = JSON.stringify(store)
  const parsed = JSON.parse(raw) as CognitiveStore
  const normalized = normalizeCognitiveStore(parsed)
  return migrateCognitiveStoreToRealityV2(normalized)
}

export function createEvalSession(): ConversationSession {
  return {
    id: EVAL_SESSION_ID,
    startedAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    topic: 'founder',
    status: 'active',
    turns: [],
    evidence: [],
    activeQuestions: [],
    confidence: 50,
    memoryWrites: [],
    knowledgeSuggestions: [],
    trackedQuestions: [],
    activeQuestionId: undefined,
  }
}

export interface EvalHarness {
  sessionId: string
  store: CognitiveStore
  session: ConversationSession
  baseInput: FounderBaseInput
}

export function createEvalHarness(initialStore?: CognitiveStore): EvalHarness {
  clearActiveMemoryStore()
  const store = initialStore ?? createEmptyEvalStore()
  setActiveMemoryStore(store)
  setCognitiveStore(store)
  return {
    sessionId: EVAL_SESSION_ID,
    store,
    session: createEvalSession(),
    baseInput: evaluationBaseInput(),
  }
}

export function buildEvalFounderInput(harness: EvalHarness): FounderInput {
  return mergeFounderInputWithWorldModel(harness.baseInput, harness.store.worldModel)
}

export function buildEvalSnapshot(harness: EvalHarness) {
  return buildFounderSnapshot(buildEvalFounderInput(harness))
}

export function collectStructuredText(store: CognitiveStore, responseMessage?: string): string {
  const beliefs = store.worldModel.realitySnapshot?.activeBeliefs ?? []
  const parts = [
    ...beliefs.map(b => b.statement),
    ...beliefs.map(b => b.normalizedValue),
    responseMessage ?? '',
  ]
  return parts.join(' ').toLowerCase()
}

export function nowMs(): number {
  return Date.now()
}
