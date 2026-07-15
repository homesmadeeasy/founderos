import type { FounderBaseInput } from '@/lib/specialists/founder/founderInputBuilder'
import type { CognitiveStore } from '@/lib/cognitive-model/beliefTypes'
import { reconcileUserEvidence } from '@/lib/cognitive-model/realityReducer'
import { createEmptyEvalStore, EVAL_SESSION_ID } from './evaluationUtils'

export const FIVE_TESTER_MSG =
  'Five people tested the Home page. Three understood that it helps decide what matters next. Two thought it was just another productivity dashboard.'

export const TEN_MORE_UNDERSTOOD_MSG =
  'Ten more users tested it after the copy change and all ten understood the value immediately.'

export const NOBODY_TESTED_CORRECTION =
  'Actually nobody has tested FounderOS yet. I was wrong about the five testers.'

export function evaluationBaseInput(): FounderBaseInput {
  return {
    objects: [],
    memories: [],
    knowledge: [],
    signals: [],
    outcomes: [],
    tasks: [],
    projects: [],
    decisionOutput: null,
    domainIntelligence: null,
    morningPlan: null,
    dailyContext: null,
    eveningReview: null,
    unprocessedCaptureCount: 0,
  }
}

export function seededFiveTesterStore(): CognitiveStore {
  const store = createEmptyEvalStore()
  const result = reconcileUserEvidence(store, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: EVAL_SESSION_ID,
    messageId: 'seed-five-testers',
  })
  return result.store
}

export function malformedLegacyStore(): CognitiveStore {
  return {
    worldModel: {
      ...createEmptyEvalStore().worldModel,
      beliefs: undefined as unknown as [],
      openQuestions: undefined as unknown as [],
    },
    timeline: undefined as unknown as [],
    lastKernelSyncAt: null,
  }
}
