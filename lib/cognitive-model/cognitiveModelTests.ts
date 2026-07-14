/**
 * Cognitive model normalization and reconciliation tests.
 * Run: npm run test:cognitive
 */
import assert from 'node:assert'
import { gatherEvidenceFromInput } from './beliefEvidence'
import { normalizeCognitiveInput, isEmptyCognitiveInput, adaptOutcomeRecord } from './cognitiveInputNormalize'
import { normalizeCognitiveStore, normalizeWorldModel } from './cognitiveNormalize'
import { syncCognitiveModel, shouldDeferEmptyReconcile, reconcileCognitiveModel, setCognitiveStore } from './cognitiveOrchestrator'
import { reconcileWorldModel, createEmptyWorldModel } from './worldModel'
import { dedupeEvidence, createEvidence } from './beliefEvidence'
import { detectContradictions } from './beliefContradictions'
import { buildCognitiveOpeningFromStore } from './cognitiveConversation'
import { getProactiveHomeMessage } from '@/lib/conversation/conversationEngine'
import { buildConversationContext } from '@/lib/conversation/conversationContext'
import { buildConversationEvidence } from '@/lib/conversation/conversationEvidence'
import {
  compactCognitiveStore,
  compactStoredCognitiveModel,
  getCognitiveStoreSizeBytes,
  cognitiveStoreSnapshot,
} from './cognitiveCompaction'
import { COGNITIVE_RETENTION } from './cognitiveRetention'
import { createBelief, updateBelief } from './beliefUpdates'
import { clearActiveMemoryStore, resetPersistInvocationCount, getPersistInvocationCount } from './cognitiveMemory'
import { saveCognitiveStore } from './beliefStorage'
import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'

function populatedInput() {
  return normalizeCognitiveInput({
    mission: 'Help founders think clearly',
    decisionSummary: 'Run validation interviews',
    founderSnapshot: {
      mainInsight: 'Validation is the bottleneck',
      mainBottleneck: 'Validation',
      momentumScore: 62,
      validationScore: 18,
      architectureScore: 95,
      executionScore: 50,
      currentStage: 'validation',
      topRecommendation: 'Talk to users',
      risks: [{ title: 'No users tested', description: 'No external proof', severity: 'high' }],
    },
    memories: [{ id: 'm1', title: 'User interview', content: 'Confusion on onboarding', type: 'learning' }],
    signals: [{ id: 's1', title: 'Low validation', summary: 'No recent user tests', type: 'signal' }],
    outcomes: [{
      prediction: {
        id: 'p1',
        decisionTitle: 'Ship onboarding',
        predictedAction: 'Ship onboarding',
        confidenceAtDecision: 55,
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      record: {
        completed: 'yes',
        actualResult: 'Shipped and tested with one user',
        createdAt: '2026-06-02T00:00:00.000Z',
      },
    }],
    knowledge: [{ id: 'k1', title: 'Talk to users', principle: 'Validate before building', domain: 'founder' }],
    conversationBeliefs: [{
      key: 'users_tested',
      label: 'Users tested',
      displayValue: 'yes',
      status: 'user_claimed',
      confidence: 60,
    }],
  })
}

function testUndefinedInput(): void {
  const normalized = normalizeCognitiveInput(undefined)
  assert.deepEqual(normalized.memories, [])
  assert.deepEqual(normalized.signals, [])
  assert.deepEqual(normalized.outcomes, [])
  assert.deepEqual(normalized.knowledge, [])
  assert.equal(normalized.mission, '')
  const evidence = gatherEvidenceFromInput(normalized)
  assert.ok(Array.isArray(evidence))
}

function testEmptyInput(): void {
  const normalized = normalizeCognitiveInput({})
  assert.ok(isEmptyCognitiveInput(normalized))
  const world = reconcileWorldModel(createEmptyWorldModel(), normalized)
  assert.ok(Array.isArray(world.beliefs))
  assert.ok(Array.isArray(world.unknowns))
}

function testMissingOutcomes(): void {
  const normalized = normalizeCognitiveInput({ founderSnapshot: { mainInsight: 'test' } })
  assert.deepEqual(normalized.outcomes, [])
  gatherEvidenceFromInput(normalized)
}

function testLegacyOutcomesObject(): void {
  const normalized = normalizeCognitiveInput({
    outcomes: { id: 'legacy', summary: 'old shape' } as unknown as [],
  })
  assert.deepEqual(normalized.outcomes, [])
}

function testOutcomeMissingSummaryAndSuccess(): void {
  const adapted = adaptOutcomeRecord({ id: 'o-legacy' })
  assert.ok(adapted)
  assert.equal(adapted!.summary, 'Outcome recorded')
  assert.equal(adapted!.supports, false)

  const normalized = normalizeCognitiveInput({ outcomes: [{ id: 'o-legacy' }] })
  assert.equal(normalized.outcomes.length, 1)
  const evidence = gatherEvidenceFromInput(normalized)
  assert.equal(evidence.length, 1)
  assert.equal(evidence[0]!.summary, 'Outcome recorded')
}

function testMissingCollections(): void {
  const normalized = normalizeCognitiveInput({
    memories: null,
    signals: undefined,
    knowledge: 'bad' as unknown as [],
    founderSnapshot: {
      mainInsight: 'Insight',
      mainBottleneck: 'Validation',
      momentumScore: 50,
      validationScore: 20,
      architectureScore: 80,
      executionScore: 40,
      currentStage: 'mvp',
      topRecommendation: 'Test',
      risks: null as unknown as [],
    },
  })
  assert.deepEqual(normalized.memories, [])
  assert.deepEqual(normalized.signals, [])
  assert.deepEqual(normalized.knowledge, [])
  assert.deepEqual(normalized.founderSnapshot?.risks, [])
  gatherEvidenceFromInput(normalized)
}

function testKnowledgeMissingContentRegression(): void {
  const normalized = normalizeCognitiveInput({
    knowledge: [{ id: 'k-bad', title: 'Principle without body', domain: 'founder' }],
    memories: [{ id: 'm-bad', title: 'Memory without body', type: 'insight' }],
  })
  assert.doesNotThrow(() => gatherEvidenceFromInput(normalized))
  const evidence = gatherEvidenceFromInput(normalized)
  assert.equal(evidence.length, 2)
  assert.ok(evidence.every((e) => typeof e.summary === 'string' && e.summary.length > 0))
}

function testLegacyPersistedStore(): void {
  const legacy = normalizeCognitiveStore({
    worldModel: {
      beliefs: [{ statement: 'Old belief', confidence: 'high' }],
      unknowns: 'not-an-array',
      currentHypotheses: [{ statement: 'Hypothesis', status: 'open' }],
    },
    timeline: 'bad',
  })
  assert.ok(Array.isArray(legacy.worldModel.beliefs))
  assert.ok(Array.isArray(legacy.worldModel.unknowns))
  assert.ok(legacy.worldModel.beliefs[0]!.statement === 'Old belief')
}

function testDuplicateEvidence(): void {
  const normalized = populatedInput()
  const items = [
    ...gatherEvidenceFromInput(normalized),
    ...gatherEvidenceFromInput(normalized),
  ]
  const deduped = dedupeEvidence(items)
  assert.ok(deduped.length < items.length)
}

function testContradictoryEvidenceAndBeliefs(): void {
  const world = reconcileWorldModel(createEmptyWorldModel(), populatedInput())
  const withConflict = {
    ...world,
    beliefs: [
      ...world.beliefs,
      {
        ...world.beliefs[0]!,
        id: 'belief-conflict-a',
        statement: 'No users tested yet',
        status: 'confirmed' as const,
      },
      {
        ...world.beliefs[0]!,
        id: 'belief-conflict-b',
        statement: 'Users tested this week',
        status: 'confirmed' as const,
      },
    ],
  }
  const contradictions = detectContradictions(withConflict.beliefs)
  assert.ok(contradictions.length > 0)
}

function testSuccessfulReconciliation(): void {
  const normalized = populatedInput()
  const world = reconcileWorldModel(createEmptyWorldModel(), normalized)
  assert.ok(world.beliefs.length > 0)
  assert.ok(world.currentHypotheses.length > 0)
  assert.ok(world.openQuestions.length > 0)
  assert.equal(world.mission, 'Help founders think clearly')
}

function testHydrationGuardDoesNotOverwritePersisted(): void {
  const persisted = normalizeCognitiveStore({
    worldModel: {
      beliefs: [{
        id: 'belief-persisted',
        topic: 'founder',
        statement: 'Persisted belief should survive hydration',
        confidence: 80,
        status: 'confirmed',
        importance: 'high',
        source: 'conversation',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
        lastReferenced: '2026-06-01T00:00:00.000Z',
        supportingEvidence: [],
        contradictingEvidence: [],
        history: [],
      }],
    },
    timeline: [],
    lastKernelSyncAt: null,
  })

  assert.ok(shouldDeferEmptyReconcile(persisted, normalizeCognitiveInput(null)))

  const rehydrated = reconcileWorldModel(persisted.worldModel, normalizeCognitiveInput(null))
  assert.ok(rehydrated.beliefs.some((b) => b.statement.includes('Persisted belief')))
}

function testReconciliationIdempotent(): void {
  clearActiveMemoryStore()
  const normalized = populatedInput()
  const first = reconcileCognitiveModel(normalized, { skipPersist: true, force: true })
  const second = reconcileCognitiveModel(normalized, { skipPersist: true, force: true })

  assert.equal(first.worldModel.beliefs.length, second.worldModel.beliefs.length)
  assert.equal(
    getCognitiveStoreSizeBytes(compactCognitiveStore(first).store),
    getCognitiveStoreSizeBytes(compactCognitiveStore(second).store),
  )

  const evidenceFirst = first.worldModel.beliefs.reduce(
    (sum, b) => sum + b.supportingEvidence.length + b.contradictingEvidence.length, 0,
  )
  const evidenceSecond = second.worldModel.beliefs.reduce(
    (sum, b) => sum + b.supportingEvidence.length + b.contradictingEvidence.length, 0,
  )
  assert.equal(evidenceFirst, evidenceSecond)
}

function testPartiallyHydratedProviderShape(): void {
  const normalized = normalizeCognitiveInput({
    founderSnapshot: { mainInsight: 'Partial snapshot' },
    memories: [{ id: 'm1', title: 'Partial memory' }],
    outcomes: {},
    signals: [{ title: 'Untitled signal', content: 'Body only' }],
  })
  assert.equal(normalized.memories.length, 1)
  assert.equal(normalized.outcomes.length, 0)
  assert.equal(normalized.signals.length, 1)
  gatherEvidenceFromInput(normalized)
}

function mockConversationCtx() {
  const snap = {
    mainInsight: 'Validation is the bottleneck.',
    mainBottleneck: 'Validation',
    validationScore: 18,
    architectureScore: 95,
    momentumScore: 62,
    executionScore: 50,
    currentStage: 'validation',
    topRecommendation: 'Talk to users',
    risks: [],
  } as unknown as FounderSnapshot
  return buildConversationContext({
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
  } as never, 'Riley')
}

function testGenerateOpeningZeroWrites(): void {
  resetPersistInvocationCount()
  const world = reconcileWorldModel(createEmptyWorldModel(), populatedInput())
  const ctx = mockConversationCtx()
  const evidence = buildConversationEvidence(ctx)
  buildCognitiveOpeningFromStore(ctx, evidence, world)
  assert.equal(getPersistInvocationCount(), 0)
}

function testProactiveMessageZeroWrites(): void {
  resetPersistInvocationCount()
  const world = reconcileWorldModel(createEmptyWorldModel(), populatedInput())
  const ctx = mockConversationCtx()
  getProactiveHomeMessage({
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
  }, 'Riley', world)
  assert.equal(getPersistInvocationCount(), 0)
}

function testBeliefHistoryOnlyOnMeaningfulChange(): void {
  const belief = createBelief('Users tested recently', 'validation', 'conversation', 55)
  const evidence = createEvidence('conversation', 'User answer', 'Yes', true, 0.7, 'answer-1')
  const first = updateBelief(belief, { evidence, reason: 'first answer' })
  const second = updateBelief(first.belief, { reason: 'same state reconcile' })
  assert.equal(first.belief.history.length >= 1, true)
  assert.equal(second.belief.history.length, first.belief.history.length)
}

function testOversizedLegacyCompaction(): void {
  const bloated = {
    worldModel: {
      beliefs: Array.from({ length: 40 }, (_, i) => ({
        id: `belief-${i}`,
        topic: 'founder',
        statement: `Belief number ${i} with a reasonably long statement to inflate storage`,
        confidence: 55,
        status: 'likely',
        importance: 'medium',
        source: 'system_inference',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
        lastReferenced: '2026-06-01T00:00:00.000Z',
        supportingEvidence: Array.from({ length: 80 }, (_, j) => ({
          id: `ev-${i}-${j}`,
          sourceType: 'memory',
          sourceId: `m-${i}-${j}`,
          title: `Evidence ${j}`,
          summary: 'x'.repeat(400),
          weight: 0.5,
          supports: true,
          recordedAt: '2026-06-01T00:00:00.000Z',
        })),
        contradictingEvidence: [],
        history: Array.from({ length: 80 }, (_, j) => ({
          id: `hist-${i}-${j}`,
          timestamp: '2026-06-01T00:00:00.000Z',
          previousStatus: 'unknown',
          newStatus: 'likely',
          previousConfidence: 40,
          newConfidence: 55,
          reason: `change ${j}`,
        })),
      })),
      openQuestions: Array.from({ length: 40 }, (_, i) => ({
        id: `q-${i}`,
        text: `Question ${i}`,
        topic: 'founder',
        uncertaintyReduction: 0.5,
        reason: 'test',
      })),
      contradictions: Array.from({ length: 40 }, (_, i) => ({
        id: `c-${i}`,
        beliefAId: `a-${i}`,
        beliefBId: `b-${i}`,
        description: `conflict ${i}`,
        detectedAt: '2026-06-01T00:00:00.000Z',
        resolved: i % 2 === 0,
      })),
    },
    timeline: Array.from({ length: 500 }, (_, i) => ({
      id: `tl-${i}`,
      type: 'kernel',
      title: `Kernel event ${i}`,
      detail: 'MemoryCreated',
      timestamp: '2026-06-01T00:00:00.000Z',
      relatedIds: [],
    })),
    lastKernelSyncAt: null,
  }
  const report = compactStoredCognitiveModel(normalizeCognitiveStore(bloated))
  assert.ok(report.afterBytes < report.beforeBytes)
  assert.ok(report.afterBytes <= COGNITIVE_RETENTION.STORAGE_BUDGET_BYTES)
  assert.ok(report.store.worldModel.beliefs.length > 0)
  assert.ok(report.store.worldModel.openQuestions.length <= COGNITIVE_RETENTION.MAX_OPEN_QUESTIONS)
}

function testQuotaSafeSaveResult(): void {
  const store = compactCognitiveStore({
    worldModel: reconcileWorldModel(createEmptyWorldModel(), populatedInput()),
    timeline: [],
    lastKernelSyncAt: null,
  }).store
  const result = saveCognitiveStore(store, { force: true })
  assert.equal(typeof result.success, 'boolean')
  assert.equal(typeof result.sizeBytes, 'number')
  assert.doesNotThrow(() => saveCognitiveStore(store))
}

function testPruningRetainsCurrentBeliefsQuestionsContradictions(): void {
  const world = reconcileWorldModel(createEmptyWorldModel(), populatedInput())
  world.contradictions = [{
    id: 'contra-1',
    beliefAId: world.beliefs[0]?.id ?? 'a',
    beliefBId: world.beliefs[1]?.id ?? 'b',
    description: 'conflict',
    detectedAt: '2026-06-01T00:00:00.000Z',
    resolved: false,
  }]
  const report = compactStoredCognitiveModel({ worldModel: world, timeline: [], lastKernelSyncAt: null })
  assert.ok(report.store.worldModel.beliefs.length > 0)
  assert.ok(report.store.worldModel.openQuestions.length > 0)
  assert.ok(report.store.worldModel.contradictions.some((c) => !c.resolved))
}

function testFiveHundredUpdatesWithinBudget(): void {
  clearActiveMemoryStore()
  const normalized = populatedInput()
  let store = reconcileCognitiveModel(normalized, { skipPersist: true, force: true })
  let previousSnapshot = cognitiveStoreSnapshot(store)

  for (let i = 0; i < 500; i++) {
    store = reconcileCognitiveModel(normalized, { skipPersist: true, force: true })
    const snapshot = cognitiveStoreSnapshot(compactCognitiveStore(store).store)
    if (snapshot === previousSnapshot) continue
    previousSnapshot = snapshot
  }

  const size = getCognitiveStoreSizeBytes(compactCognitiveStore(store).store)
  assert.ok(size <= COGNITIVE_RETENTION.STORAGE_BUDGET_BYTES)
}

function testIdenticalReconcileDoesNotGrowSerializedSize(): void {
  clearActiveMemoryStore()
  const normalized = populatedInput()
  const first = compactCognitiveStore(reconcileCognitiveModel(normalized, { skipPersist: true, force: true })).store
  const second = compactCognitiveStore(reconcileCognitiveModel(normalized, { skipPersist: true, force: true })).store
  assert.equal(getCognitiveStoreSizeBytes(first), getCognitiveStoreSizeBytes(second))
  assert.equal(cognitiveStoreSnapshot(first), cognitiveStoreSnapshot(second))
}

export function runCognitiveModelTests(): { passed: number; failed: string[] } {
  const tests = [
    ['undefined input', testUndefinedInput],
    ['empty input', testEmptyInput],
    ['missing outcomes', testMissingOutcomes],
    ['legacy outcomes object', testLegacyOutcomesObject],
    ['outcome missing summary/success', testOutcomeMissingSummaryAndSuccess],
    ['missing signals/memories/knowledge', testMissingCollections],
    ['knowledge content regression', testKnowledgeMissingContentRegression],
    ['legacy persisted store', testLegacyPersistedStore],
    ['duplicate evidence', testDuplicateEvidence],
    ['contradictory evidence', testContradictoryEvidenceAndBeliefs],
    ['successful reconciliation', testSuccessfulReconciliation],
    ['hydration guard', testHydrationGuardDoesNotOverwritePersisted],
    ['idempotent reconciliation', testReconciliationIdempotent],
    ['partially hydrated provider shape', testPartiallyHydratedProviderShape],
    ['generateOpening zero writes', testGenerateOpeningZeroWrites],
    ['proactive message zero writes', testProactiveMessageZeroWrites],
    ['belief history meaningful only', testBeliefHistoryOnlyOnMeaningfulChange],
    ['oversized legacy compaction', testOversizedLegacyCompaction],
    ['quota-safe save result', testQuotaSafeSaveResult],
    ['pruning retains essentials', testPruningRetainsCurrentBeliefsQuestionsContradictions],
    ['500 updates within budget', testFiveHundredUpdatesWithinBudget],
    ['identical reconcile stable size', testIdenticalReconcileDoesNotGrowSerializedSize],
  ] as const

  const failed: string[] = []
  for (const [name, fn] of tests) {
    try {
      fn()
    } catch (e) {
      failed.push(`${name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { passed: tests.length - failed.length, failed }
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('cognitiveModelTests')) {
  const result = runCognitiveModelTests()
  if (result.failed.length) {
    console.error('FAILED:', result.failed)
    process.exit(1)
  }
  console.log(`All ${result.passed} cognitive model tests passed.`)
}
