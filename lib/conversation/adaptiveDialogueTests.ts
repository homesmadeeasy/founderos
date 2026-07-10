/**
 * Deterministic adaptive dialogue test fixtures.
 * Run: npx tsx lib/conversation/adaptiveDialogueTests.ts
 */
import assert from 'node:assert'
import type { ConversationSession, ConversationContext } from './conversationTypes'
import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import { processAdaptiveAnswer, initializeAdaptiveSession, getActiveAnswerOptions } from './conversationAdaptive'
import { parseUserCount, parseTestedSurface, VALIDATION_BELIEF_KEYS, getBelief } from './conversationBeliefs'
import { newConversationId, nowISO } from './conversationUtils'

function mockSnapshot(): FounderSnapshot {
  return {
    mainInsight: 'Validation is the bottleneck.',
    mainBottleneck: 'Validation',
    validationScore: 18,
    architectureScore: 95,
    momentumScore: 62,
    executionScore: 50,
    currentStage: 'building',
    topRecommendation: 'Run user interviews',
    narrative: 'Building ahead of proof.',
    suggestedSprint: { title: 'Validation', tasks: ['Test with users'] },
    ignoreToday: ['Skip new features'],
    risks: [],
    roadmap: [],
    questions: [],
    evidence: [],
  } as unknown as FounderSnapshot
}

function mockCtx(): ConversationContext {
  const snap = mockSnapshot()
  return {
    founderSnapshot: snap,
    greeting: 'Good evening',
    userName: 'Riley',
    topDomain: 'founder',
    recoveryScore: 70,
    validationScore: 18,
    architectureScore: 95,
    schoolPressure: false,
    healthSlipping: false,
    recentQuestionIds: [],
    answeredToday: [],
    hour: 19,
  }
}

function baseSession(): ConversationSession {
  const ctx = mockCtx()
  const session: ConversationSession = {
    id: newConversationId(),
    startedAt: nowISO(),
    updatedAt: nowISO(),
    topic: 'validation',
    status: 'active',
    turns: [],
    evidence: [],
    activeQuestions: [],
    confidence: 55,
    memoryWrites: [],
    knowledgeSuggestions: [],
  }
  return initializeAdaptiveSession(ctx, session)
}

function caseA(): void {
  const ctx = mockCtx()
  let session = baseSession()
  session.activeQuestionId = 'q-validation-users'

  const r1 = processAdaptiveAnswer(ctx, session, 'Yes', 'q-validation-users', 'turn-user-1')
  session = { ...session, ...r1, turns: [...session.turns, r1.reply] }

  assert.ok(r1.reply.content.includes('how many'), 'Case A: should ask user count')
  assert.equal(getBelief(r1.beliefs, VALIDATION_BELIEF_KEYS.usersTested)?.status, 'user_claimed')
  assert.equal(r1.activeQuestionId, 'q-validation-user-count')

  const evidenceTitles = r1.sessionEvidence.map(e => e.title).join(' ')
  assert.ok(!evidenceTitles.includes('No real users yet'), 'Case A: no stale no-users label')
  assert.ok(evidenceTitles.includes('User reports'), 'Case A: user report shown')

  const opts = getActiveAnswerOptions({ ...session, trackedQuestions: r1.trackedQuestions, activeQuestionId: r1.activeQuestionId })
  assert.ok(opts.includes('1'), 'Case A: numeric options')
  assert.ok(!opts.includes('Yes'), 'Case A: no Yes on count question')
}

function caseB(): void {
  const ctx = mockCtx()
  const session = baseSession()
  const r = processAdaptiveAnswer(ctx, session, 'No', 'q-validation-users', 'turn-user-2')

  assert.equal(getBelief(r.beliefs, VALIDATION_BELIEF_KEYS.usersTested)?.status, 'confirmed')
  assert.equal(getBelief(r.beliefs, VALIDATION_BELIEF_KEYS.usersTested)?.value, false)
  assert.ok(r.reply.actionCard?.type === 'validation_sprint', 'Case B: sprint offered')
  assert.ok(r.reply.content.includes('first-impression'), 'Case B: recommends test')
}

function caseC(): void {
  assert.equal(parseUserCount('Three people tested Home'), 3)
  assert.equal(parseTestedSurface('Three people tested Home'), 'Home')

  const ctx = mockCtx()
  let session = baseSession()
  const r = processAdaptiveAnswer(ctx, session, 'Three people tested Home', 'q-validation-user-count', 'turn-user-3')

  assert.equal(getBelief(r.beliefs, VALIDATION_BELIEF_KEYS.userCount)?.value, 3)
  assert.equal(getBelief(r.beliefs, VALIDATION_BELIEF_KEYS.testedSurface)?.value, 'Home')
  assert.ok(r.reply.content.includes('comprehension') || r.reply.content.includes('Which part'), 'Case C: next question')
}

function caseD(): void {
  const ctx = mockCtx()
  const session = baseSession()
  const r = processAdaptiveAnswer(ctx, session, 'Yes', 'q-validation-users', 'turn-user-4')

  const historical = r.sessionEvidence.find(e => e.evidenceKind === 'historical')
  const userReport = r.sessionEvidence.find(e => e.evidenceKind === 'user_report')
  assert.ok(historical, 'Case D: historical retained')
  assert.ok(userReport, 'Case D: user report shown')
  assert.ok(
    userReport!.summary.includes('not yet confirmed') || userReport!.title.includes('reports'),
    'Case D: pending confirmation',
  )
}

function caseE(): void {
  const ctx = mockCtx()
  let session = baseSession()
  const r1 = processAdaptiveAnswer(ctx, session, 'Yes', 'q-validation-users', 'turn-1')
  session = {
    ...session,
    beliefs: r1.beliefs,
    trackedQuestions: r1.trackedQuestions,
    activeQuestionId: r1.activeQuestionId,
  }
  const answered = r1.trackedQuestions.find(q => q.id === 'q-validation-users')
  assert.equal(answered?.status, 'answered', 'Case E: question marked answered')

  const optsForOld = getActiveAnswerOptions({
    ...session,
    activeQuestionId: 'q-validation-users',
    trackedQuestions: r1.trackedQuestions,
  })
  assert.equal(optsForOld.length, 0, 'Case E: no buttons for answered question')
}

export function runAdaptiveDialogueTests(): { passed: number; failed: string[] } {
  const failed: string[] = []
  const tests = [
    ['Case A', caseA],
    ['Case B', caseB],
    ['Case C', caseC],
    ['Case D', caseD],
    ['Case E', caseE],
  ] as const

  for (const [name, fn] of tests) {
    try {
      fn()
    } catch (e) {
      failed.push(`${name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { passed: tests.length - failed.length, failed }
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('adaptiveDialogueTests')) {
  const result = runAdaptiveDialogueTests()
  if (result.failed.length) {
    console.error('FAILED:', result.failed)
    process.exit(1)
  }
  console.log(`All ${result.passed} adaptive dialogue tests passed.`)
}
