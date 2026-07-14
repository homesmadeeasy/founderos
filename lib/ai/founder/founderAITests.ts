/**
 * Founder AI v2 tests — deterministic, no OpenAI calls.
 * Run: npm run test:founder-ai
 */
import assert from 'node:assert'
import { buildCompactFounderContext } from './founderAI.context'
import { FounderAIResponseSchema } from './founderAI.schema'
import { validateFounderAIResponse } from './founderAI.validation'
import { buildDeterministicFounderAIResponse } from './founderAI.fallback'
import {
  clearPendingProposals,
  loadProposalStore,
  saveProposalStore,
  upsertProposal,
} from './founderAI.proposals'
import { createEmptyWorldModel } from '@/lib/cognitive-model/worldModel'
import type { ConversationSession } from '@/lib/conversation/conversationTypes'
import type { FounderAIResponse } from './founderAI.types'
import { resetFounderAIRateLimitsForTests } from './founderAI.rateLimit'

function mockSession(): ConversationSession {
  return {
    id: 'session-test',
    startedAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    topic: 'founder',
    status: 'active',
    turns: [],
    evidence: [{
      id: 'ev-1',
      sourceType: 'memory',
      title: 'User interview',
      summary: 'Five people tested onboarding',
      weight: 0.7,
      supports: true,
      evidenceKind: 'user_report',
    }],
    activeQuestions: [],
    confidence: 55,
    memoryWrites: [],
    knowledgeSuggestions: [],
    trackedQuestions: [{
      id: 'q-validation-users',
      topic: 'validation',
      questionType: 'open_text',
      text: 'Have real users tested the product?',
      answerOptions: [],
      status: 'unanswered',
      evidenceRequired: true,
    }],
    activeQuestionId: 'q-validation-users',
  }
}

function mockInput() {
  return {
    objects: [],
    memories: [{
      id: 'm1',
      type: 'learning' as const,
      title: 'Interview',
      content: 'Five users tested',
      importance: 'medium' as const,
      area: 'systems' as const,
      source: 'manual' as const,
      relatedObjectIds: [],
      tags: [],
      occurredAt: '2026-06-01T00:00:00.000Z',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    }],
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

function testCompactContextLimits(): void {
  const session = mockSession()
  for (let i = 0; i < 20; i++) {
    session.turns.push({
      id: `turn-${i}`,
      role: i % 2 === 0 ? 'user' : 'founder_ai',
      content: `Message ${i}`,
      intent: 'reflect',
      mood: 'calm',
      topic: 'founder',
      evidence: [],
      createdAt: '2026-06-01T00:00:00.000Z',
    })
  }
  const ctx = buildCompactFounderContext({
    userMessage: 'Five people tested it; three understood, two thought it was another productivity app.',
    session,
    input: mockInput() as never,
    userName: 'Riley',
    worldModel: createEmptyWorldModel(),
  })
  assert.ok(ctx.recentTurns.length <= 8)
  assert.ok(ctx.evidence.length <= 14)
  assert.ok(ctx.userMessage.length <= 2000)
}

function testSchemaValidation(): void {
  const parsed = FounderAIResponseSchema.parse({
    message: 'Thanks for the user report.',
    reasoningSummary: 'User-reported validation evidence.',
    confidence: 72,
    evidenceIds: ['ev-1'],
    beliefsToUpdate: [{
      proposition: 'Users tested: yes (5 people)',
      operation: 'confirm',
      confidenceDelta: 10,
      rationale: 'User report',
      evidenceIds: ['ev-1'],
    }],
    suggestedActions: [],
  })
  assert.equal(parsed.message, 'Thanks for the user report.')
}

function testEvidenceIdFiltering(): void {
  const context = buildCompactFounderContext({
    userMessage: 'test',
    session: mockSession(),
    input: mockInput() as never,
    userName: 'Riley',
    worldModel: createEmptyWorldModel(),
  })
  const raw: FounderAIResponse = {
    message: 'ok',
    reasoningSummary: 'reason',
    confidence: 50,
    evidenceIds: ['ev-1', 'fake-evidence'],
    beliefsToUpdate: [{
      proposition: 'Users tested recently',
      operation: 'confirm',
      confidenceDelta: 5,
      rationale: 'report',
      evidenceIds: ['fake-evidence'],
    }],
    contradictionsToCreate: [],
    suggestedActions: [],
    memoryDrafts: [],
    knowledgeDrafts: [],
  }
  const validated = validateFounderAIResponse(raw, context)
  assert.deepEqual(validated.evidenceIds, ['ev-1'])
  assert.equal(validated.beliefsToUpdate[0]!.evidenceIds.length, 0)
}

function testBeliefOverwriteProtection(): void {
  const context = buildCompactFounderContext({
    userMessage: 'test',
    session: mockSession(),
    input: mockInput() as never,
    userName: 'Riley',
    worldModel: {
      ...createEmptyWorldModel(),
      beliefs: [{
        id: 'belief-1',
        topic: 'validation',
        statement: 'No users tested yet',
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
  })
  const raw: FounderAIResponse = {
    message: 'ok',
    reasoningSummary: 'reason',
    confidence: 50,
    evidenceIds: [],
    beliefsToUpdate: [{
      beliefId: 'belief-1',
      proposition: 'No users tested yet',
      operation: 'update',
      confidenceDelta: -40,
      rationale: 'silent overwrite attempt',
      evidenceIds: [],
    }],
    contradictionsToCreate: [],
    suggestedActions: [],
    memoryDrafts: [],
    knowledgeDrafts: [],
  }
  const validated = validateFounderAIResponse(raw, context)
  assert.equal(validated.beliefsToUpdate[0]!.operation, 'confirm')
}

function testUnsupportedActionRejection(): void {
  const context = buildCompactFounderContext({
    userMessage: 'test',
    session: mockSession(),
    input: mockInput() as never,
    userName: 'Riley',
    worldModel: createEmptyWorldModel(),
  })
  const raw: FounderAIResponse = {
    message: 'ok',
    reasoningSummary: 'reason',
    confidence: 50,
    evidenceIds: [],
    beliefsToUpdate: [],
    contradictionsToCreate: [],
    suggestedActions: [{
      id: 'bad-1',
      type: 'delete_all_data' as never,
      title: 'Delete',
      description: 'bad',
      rationale: 'bad',
      confidence: 50,
      domain: 'founder',
      reversible: false,
      requiresApproval: true,
      payload: { secret: 'nope' },
    }],
    memoryDrafts: [],
    knowledgeDrafts: [],
  }
  const validated = validateFounderAIResponse(raw, context)
  assert.equal(validated.suggestedActions.length, 0)
}

function testDuplicateProposalRemoval(): void {
  const context = buildCompactFounderContext({
    userMessage: 'test',
    session: mockSession(),
    input: mockInput() as never,
    userName: 'Riley',
    worldModel: createEmptyWorldModel(),
  })
  const raw: FounderAIResponse = {
    message: 'ok',
    reasoningSummary: 'reason',
    confidence: 50,
    evidenceIds: [],
    beliefsToUpdate: [
      { proposition: 'Same belief', operation: 'confirm', confidenceDelta: 5, rationale: 'a', evidenceIds: [] },
      { proposition: 'Same belief', operation: 'confirm', confidenceDelta: 5, rationale: 'b', evidenceIds: [] },
    ],
    contradictionsToCreate: [],
    suggestedActions: [
      { id: 'a1', type: 'create_task', title: 'Task', description: 'd', rationale: 'r', confidence: 50, domain: 'founder', reversible: true, requiresApproval: true, payload: {} },
      { id: 'a2', type: 'create_task', title: 'Task', description: 'd2', rationale: 'r2', confidence: 50, domain: 'founder', reversible: true, requiresApproval: true, payload: {} },
    ],
    memoryDrafts: [],
    knowledgeDrafts: [],
  }
  const validated = validateFounderAIResponse(raw, context)
  assert.equal(validated.beliefsToUpdate.length, 1)
  assert.equal(validated.suggestedActions.length, 1)
}

function testFallbackOutput(): void {
  const { response } = buildDeterministicFounderAIResponse({
    userMessage: 'Five people tested it',
    session: mockSession(),
    input: mockInput() as never,
    userName: 'Riley',
    worldModel: createEmptyWorldModel(),
    userTurnId: 'turn-user-1',
    questionId: 'q-validation-users',
  })
  assert.ok(response.message.length > 0)
  assert.equal(response.usedDeterministicFallback, true)
}

function testProposalStorageBounds(): void {
  clearPendingProposals()
  for (let i = 0; i < 60; i++) {
    upsertProposal({
      id: `proposal-${i}`,
      turnId: `turn-${i}`,
      sessionId: 'session-test',
      createdAt: '2026-06-01T00:00:00.000Z',
      status: 'pending',
      mode: 'deterministic',
      response: {
        message: 'm',
        reasoningSummary: 'r',
        confidence: 50,
        evidenceIds: [],
        beliefsToUpdate: [],
        contradictionsToCreate: [],
        suggestedActions: [],
        memoryDrafts: [],
        knowledgeDrafts: [],
      },
    })
  }
  const store = loadProposalStore()
  assert.ok(store.pending.length <= 40)
}

function testQuotaExceededHandling(): void {
  // In Node tests there is no window — persistence is a no-op success.
  if (typeof window === 'undefined') {
    const ok = saveProposalStore({ version: 1, pending: [], resolved: [] })
    assert.equal(ok, true)
    return
  }

  const original = window.localStorage
  const map = new Map<string, string>()
  const throwingStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: () => { throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }) },
    removeItem: (k: string) => { map.delete(k) },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  }
  Object.defineProperty(window, 'localStorage', { value: throwingStorage, configurable: true })
  try {
    const ok = saveProposalStore({ version: 1, pending: [], resolved: [] })
    assert.equal(ok, false)
  } finally {
    Object.defineProperty(window, 'localStorage', { value: original, configurable: true })
  }
}

function testUserValidationScenario(): void {
  const context = buildCompactFounderContext({
    userMessage: 'Five people tested it. Three understood it; two thought it was another productivity dashboard.',
    session: mockSession(),
    input: mockInput() as never,
    userName: 'Riley',
    worldModel: createEmptyWorldModel(),
  })
  const raw: FounderAIResponse = {
    message: 'That is meaningful validation. Two positioning misses suggest we should clarify the category.',
    reasoningSummary: 'User-reported evidence replaces earlier no-users inference.',
    confidence: 68,
    evidenceIds: ['ev-1'],
    beliefsToUpdate: [{
      proposition: 'Users tested: yes (5 people, mixed comprehension)',
      operation: 'confirm',
      confidenceDelta: 15,
      rationale: 'Direct user report in conversation',
      evidenceIds: ['ev-1'],
    }],
    contradictionsToCreate: [],
    nextQuestion: {
      text: 'What did the three people who understood it believe FounderOS would do for them?',
      purpose: 'Clarify positioning for successful users',
      answerType: 'open_text',
    },
    suggestedActions: [{
      id: 'action-positioning',
      type: 'create_task',
      title: 'Rewrite homepage for category clarity',
      description: 'Test revised positioning with next 3 users',
      rationale: 'Two of five confused the category',
      confidence: 70,
      domain: 'validation',
      reversible: true,
      requiresApproval: true,
      payload: { title: 'Rewrite homepage for category clarity' },
    }],
    memoryDrafts: [],
    knowledgeDrafts: [],
  }
  const validated = validateFounderAIResponse(raw, context)
  assert.ok(validated.beliefsToUpdate.length > 0)
  assert.ok(validated.nextQuestion?.text.includes('understood'))
  assert.ok(!validated.message.toLowerCase().includes('show it to three people'))
}

export function runFounderAITests(): { passed: number; failed: string[] } {
  resetFounderAIRateLimitsForTests()
  const tests = [
    ['compact context limits', testCompactContextLimits],
    ['schema validation', testSchemaValidation],
    ['evidence id filtering', testEvidenceIdFiltering],
    ['belief overwrite protection', testBeliefOverwriteProtection],
    ['unsupported action rejection', testUnsupportedActionRejection],
    ['duplicate proposal removal', testDuplicateProposalRemoval],
    ['fallback output', testFallbackOutput],
    ['proposal storage bounds', testProposalStorageBounds],
    ['quota exceeded handling', testQuotaExceededHandling],
    ['user validation scenario', testUserValidationScenario],
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

if (typeof process !== 'undefined' && process.argv[1]?.includes('founderAITests')) {
  const result = runFounderAITests()
  if (result.failed.length) {
    console.error('FAILED:', result.failed)
    process.exit(1)
  }
  console.log(`All ${result.passed} Founder AI tests passed.`)
}
