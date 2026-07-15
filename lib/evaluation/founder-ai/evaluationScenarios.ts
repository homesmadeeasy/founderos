import type { EvaluationScenario } from './evaluationTypes'
import {
  FIVE_TESTER_MSG,
  TEN_MORE_UNDERSTOOD_MSG,
  NOBODY_TESTED_CORRECTION,
  seededFiveTesterStore,
  malformedLegacyStore,
} from './evaluationFixtures'
import { createEmptyEvalStore, simulatePageRefresh } from './evaluationUtils'
import { migrateCognitiveStoreToRealityV2 } from '@/lib/cognitive-model/realityReducer'
import { normalizeCognitiveStore } from '@/lib/cognitive-model/cognitiveNormalize'
import { compactRealityMeta } from '@/lib/cognitive-model/realityCompaction'

export const ALL_EVALUATION_SCENARIOS: EvaluationScenario[] = [
  {
    id: 'absence-not-nobody-tested',
    title: 'No evidence must not become nobody tested',
    category: 'absence_of_evidence',
    severity: 'critical',
    turns: [],
    expected: {
      beliefs: [{
        predicate: 'validation.users_tested',
        mustNotExist: true,
      }],
      forbiddenClaimPhrases: ['nobody tested', 'no one tested', 'users have not tested'],
      uncertaintyInResponse: false,
      validationScoreMax: 35,
    },
  },
  {
    id: 'five-tester-positioning-shift',
    title: 'Five testers move bottleneck from validation to positioning',
    category: 'recommendation_changes',
    severity: 'critical',
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true', minConfidence: 60 }],
      validationScoreMin: 45,
      positioningRiskMin: 50,
      bottleneck: 'UX clarity',
      recommendationIncludes: ['positioning', 'first screen'],
      nextQuestionIncludes: ['screen', 'words'],
      changesCountMin: 1,
      supersededHistoryRetained: true,
    },
  },
  {
    id: 'ten-more-updates-recommendation',
    title: 'Ten more understood users updates strategy again',
    category: 'recommendation_changes',
    severity: 'critical',
    initialState: { store: seededFiveTesterStore() },
    turns: [{ userMessage: TEN_MORE_UNDERSTOOD_MSG }],
    expected: {
      validationScoreMin: 55,
      bottleneckNot: 'Validation',
      changesCountMin: 1,
    },
  },
  {
    id: 'correction-supersedes-inference',
    title: 'User correction supersedes inferred belief without deleting history',
    category: 'correction_handling',
    severity: 'critical',
    turns: [
      { userMessage: FIVE_TESTER_MSG },
      { userMessage: NOBODY_TESTED_CORRECTION },
    ],
    expected: {
      supersededHistoryRetained: true,
      changesCountMin: 1,
    },
  },
  {
    id: 'duplicate-message-idempotent',
    title: 'Repeating the same message does not duplicate reality changes',
    category: 'idempotency',
    severity: 'critical',
    turns: [
      { userMessage: FIVE_TESTER_MSG },
      { userMessage: FIVE_TESTER_MSG, kind: 'repeat_previous', repeatTurnIndex: 0 },
    ],
    expected: {
      idempotentOnFinalTurn: true,
      changesCountMax: 0,
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true' }],
    },
  },
  {
    id: 'contradiction-surfaced',
    title: 'Contradictory statements create visible contradiction',
    category: 'contradiction_handling',
    severity: 'critical',
    turns: [
      { userMessage: FIVE_TESTER_MSG },
      { userMessage: 'Actually nobody has tested FounderOS yet. I was wrong.' },
    ],
    expected: {
      changesCountMin: 1,
    },
  },
  {
    id: 'refresh-persists-beliefs',
    title: 'After refresh reconciled beliefs and evidence remain',
    category: 'refresh_persistence',
    severity: 'critical',
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      persistAfterRefresh: true,
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true', minConfidence: 55 }],
      evidenceForPredicate: 'validation.users_tested',
    },
  },
  {
    id: 'build-next-uses-latest-model',
    title: 'What should I build next uses latest world model',
    category: 'recommendation_changes',
    severity: 'critical',
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      bottleneck: 'UX clarity',
      recommendationIncludes: ['positioning', 'first screen'],
      recommendationExcludes: ['3 people and ask what they understand'],
    },
  },
  {
    id: 'uncertain-without-evidence',
    title: 'Founder AI expresses uncertainty when evidence is insufficient',
    category: 'uncertainty_language',
    severity: 'critical',
    turns: [{ userMessage: 'Maybe users like it? Not sure.' }],
    expected: {
      uncertaintyInResponse: true,
      validationScoreMax: 50,
    },
  },
  {
    id: 'explicit-correction-handling',
    title: 'Explicit correction updates active belief',
    category: 'correction_handling',
    turns: [
      { userMessage: 'Ten people tested the onboarding flow.' },
      { userMessage: 'Correction: only three people tested onboarding, not ten.' },
    ],
    expected: {
      changesCountMin: 1,
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true' }],
    },
  },
  {
    id: 'partial-tester-info',
    title: 'Partial information still updates validation directionally',
    category: 'partial_information',
    turns: [{ userMessage: 'A few people tried the Home page last week.' }],
    expected: {
      changesCountMin: 1,
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true', maxConfidence: 85 }],
    },
  },
  {
    id: 'confidence-detailed-vs-bare',
    title: 'Detailed answer yields higher confidence than bare yes',
    category: 'confidence_calibration',
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true', minConfidence: 65 }],
    },
  },
  {
    id: 'stale-belief-replaced',
    title: 'Stale absence inference replaced by user evidence',
    category: 'stale_belief_replacement',
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      supersededHistoryRetained: true,
      forbiddenClaimPhrases: ['no stored validation evidence is the current truth'],
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true' }],
    },
  },
  {
    id: 'similar-entity-home',
    title: 'Home page and Home resolve to same surface',
    category: 'similar_entity_names',
    turns: [{ userMessage: 'Three people tested Home and two were confused.' }],
    expected: {
      beliefs: [{ predicate: 'validation.tested_surface', mustExist: true }],
      changesCountMin: 1,
    },
  },
  {
    id: 'user-reported-classification',
    title: 'User-reported facts classified correctly',
    category: 'user_reported_facts',
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      beliefs: [{
        predicate: 'validation.users_tested',
        normalizedValue: 'true',
        sourceClassification: 'user_reported',
      }],
    },
  },
  {
    id: 'ambiguous-vague-statement',
    title: 'Ambiguous statement does not fabricate precise counts',
    category: 'ambiguous_statements',
    turns: [{ userMessage: 'Some people looked at it.' }],
    expected: {
      forbiddenClaimPhrases: ['exactly five', 'exactly ten', '100% understood'],
      changesCountMin: 0,
    },
  },
  {
    id: 'evidence-attribution-ids',
    title: 'Belief changes retain evidence references',
    category: 'evidence_attribution',
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      evidenceForPredicate: 'validation.users_tested',
      changesCountMin: 1,
    },
  },
  {
    id: 'next-question-after-evidence',
    title: 'Next question shifts after new evidence',
    category: 'unanswered_questions',
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      nextQuestionIncludes: ['screen', 'words'],
    },
  },
  {
    id: 'user-rejects-assumption',
    title: 'User rejects AI assumption via correction',
    category: 'user_rejects_assumption',
    turns: [
      { userMessage: 'I think maybe five people tested it.' },
      { userMessage: 'No, that was just a guess — nobody has tested it.' },
    ],
    expected: {
      changesCountMin: 1,
    },
  },
  {
    id: 'user-confirms-assumption',
    title: 'User confirms prior uncertainty with detail',
    category: 'user_confirms_assumption',
    turns: [
      { userMessage: 'I am not sure if anyone tested FounderOS.' },
      { userMessage: FIVE_TESTER_MSG },
    ],
    expected: {
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true', minConfidence: 60 }],
      changesCountMin: 1,
    },
  },
  {
    id: 'conflicting-statements-over-time',
    title: 'Conflicting user statements over time are retained',
    category: 'conflicting_statements',
    turns: [
      { userMessage: 'Nobody has tested FounderOS.' },
      { userMessage: FIVE_TESTER_MSG },
    ],
    expected: {
      changesCountMin: 1,
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true' }],
    },
  },
  {
    id: 'outcome-shifts-decision-priority',
    title: 'New outcomes change strategic emphasis',
    category: 'outcomes_strategy',
    initialState: { store: seededFiveTesterStore() },
    turns: [{ userMessage: 'We shipped a positioning rewrite and retention improved 20%.' }],
    expected: {
      changesCountMin: 0,
      validationScoreMin: 45,
    },
  },
  {
    id: 'memory-vs-state-conflict',
    title: 'Fresh user statement overrides stale memory inference',
    category: 'memory_state_conflict',
    turns: [{ userMessage: NOBODY_TESTED_CORRECTION }],
    expected: {
      forbiddenClaimPhrases: ['five people tested', 'five testers'],
    },
  },
  {
    id: 'misleading-productivity-keyword',
    title: 'Dashboard keyword elevates positioning risk',
    category: 'misleading_keywords',
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      positioningRiskMin: 50,
      recommendationIncludes: ['positioning'],
    },
  },
  {
    id: 'irrelevant-information-ignored',
    title: 'Irrelevant information does not corrupt validation beliefs',
    category: 'irrelevant_information',
    turns: [{ userMessage: 'The weather is nice and I had coffee this morning.' }],
    expected: {
      beliefs: [{ predicate: 'validation.users_tested', mustNotExist: true }],
      changesCountMax: 2,
    },
  },
  {
    id: 'unsupported-claims-blocked',
    title: 'No fabricated user counts without evidence',
    category: 'unsupported_claims',
    severity: 'critical',
    turns: [{ userMessage: 'Tell me about my users.' }],
    expected: {
      forbiddenClaimPhrases: ['100 users', '50 testers', 'thousands of users'],
      beliefs: [{ predicate: 'validation.users_tested', mustNotExist: true }],
    },
  },
  {
    id: 'conversation-continuation',
    title: 'Multi-turn conversation preserves reconciled state',
    category: 'conversation_continuation',
    turns: [
      { userMessage: 'Three people tested the Home page.' },
      { userMessage: 'Two of them were confused about the value prop.' },
      { userMessage: 'What are you uncertain about?', kind: 'query' },
    ],
    expected: {
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true' }],
      cognitiveQuery: {
        prompt: 'What are you uncertain about?',
        mustInclude: ['uncertain'],
      },
    },
  },
  {
    id: 'evidence-of-absence-distinction',
    title: 'Absence of evidence stays distinct from evidence of absence',
    category: 'evidence_of_absence',
    turns: [{ userMessage: 'I have not run any user tests yet.' }],
    expected: {
      changesCountMin: 0,
      forbiddenClaimPhrases: ['five people tested'],
      beliefs: [{ predicate: 'validation.users_tested', mustNotExist: true }],
    },
  },
  {
    id: 'duplicate-messages-no-claim-dup',
    title: 'Duplicate messages do not duplicate claims',
    category: 'duplicate_messages',
    turns: [
      { userMessage: FIVE_TESTER_MSG },
      { userMessage: FIVE_TESTER_MSG },
      { userMessage: FIVE_TESTER_MSG },
    ],
    expected: {
      idempotentOnFinalTurn: true,
    },
  },
  {
    id: 'malformed-storage-migration',
    title: 'Malformed legacy store migrates without crash',
    category: 'malformed_storage',
    initialState: {
      store: migrateCognitiveStoreToRealityV2(normalizeCognitiveStore(malformedLegacyStore())),
    },
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true' }],
      changesCountMin: 1,
    },
  },
  {
    id: 'storage-quota-compaction',
    title: 'Oversized processed keys compact safely',
    category: 'storage_quota',
    initialState: {
      store: (() => {
        const store = createEmptyEvalStore()
        store.realityMeta = compactRealityMeta({
          version: 2,
          processedMessageKeys: Array.from({ length: 300 }, (_, i) => `k-${i}`),
          lastCompactionAt: null,
          approximateBytes: 0,
          droppedArchiveCount: 0,
        })
        return store
      })(),
    },
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      changesCountMin: 1,
    },
  },
  {
    id: 'query-have-users-tested',
    title: 'Cognitive query answers testing status from reconciled model',
    category: 'user_reported_facts',
    turns: [
      { userMessage: FIVE_TESTER_MSG },
      { userMessage: 'Have real users tested this?', kind: 'query' },
    ],
    expected: {
      cognitiveQuery: {
        prompt: 'Have real users tested this?',
        mustInclude: ['tested'],
        mustNotInclude: ['do not have confirmed'],
      },
    },
  },
  {
    id: 'low-confidence-absence',
    title: 'Absence inference keeps low confidence',
    category: 'uncertainty_language',
    turns: [],
    expected: {
      validationScoreMax: 40,
      forbiddenClaimPhrases: ['confirmed that nobody'],
    },
  },
  {
    id: 'refresh-after-correction',
    title: 'Corrections persist across simulated refresh',
    category: 'refresh_persistence',
    severity: 'critical',
    turns: [
      { userMessage: FIVE_TESTER_MSG },
      { userMessage: NOBODY_TESTED_CORRECTION },
    ],
    expected: {
      persistAfterRefresh: true,
      supersededHistoryRetained: true,
    },
  },
  {
    id: 'llm-fallback-deterministic',
    title: 'Deterministic path used when LLM disabled',
    category: 'llm_fallback',
    turns: [{ userMessage: FIVE_TESTER_MSG }],
    expected: {
      llmMustUseFallback: true,
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true' }],
    },
  },
]

export function resetEvaluationFixtures(): void {
  // Scenarios are pure data; refresh clears in-memory reports via storage module.
  void simulatePageRefresh(createEmptyEvalStore())
}
