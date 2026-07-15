import { createEmptyWorldModel } from './worldModel'
import { normalizeCognitiveStore } from './cognitiveNormalize'
import { buildIdempotencyKey, extractClaimsFromText, normalizeClaimKey } from './claimExtraction'
import { reconcileUserEvidence, migrateCognitiveStoreToRealityV2 } from './realityReducer'
import { ensureSeedBeliefs } from './beliefReconciliation'
import { getCurrentBelief, selectNextRealityQuestion } from './realityQueries'
import { computeFounderScores } from '@/lib/specialists/founder/founderScoring'
import { gatherFounderData } from '@/lib/specialists/founder/founderSignals'
import { applyWorldModelToDecisionScoring } from './cognitiveDecision'
import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import { compactRealityMeta } from './realityCompaction'

const FIVE_TESTER_MSG = 'Five people tested the Home page. Three understood that it helps decide what matters next. Two thought it was just another productivity dashboard.'
const SESSION = 'sess-test'
const MSG = 'msg-test'

function emptyStore() {
  return normalizeCognitiveStore({
    worldModel: createEmptyWorldModel(),
    timeline: [],
    lastKernelSyncAt: null,
  })
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

function testNoEvidenceProducesAbsenceInference() {
  const store = migrateCognitiveStoreToRealityV2(emptyStore())
  const beliefs = ensureSeedBeliefs(store.worldModel.beliefs)
  const absence = beliefs.find(b => /no stored validation/i.test(b.statement))
  assert(Boolean(absence), 'absence inference should exist')
  assert((absence?.confidence ?? 0) < 55, 'absence inference should be uncertain/low')
  console.log('PASS: no evidence produces uncertain absence-of-evidence inference')
}

function testFiveTesterStatement() {
  const store = migrateCognitiveStoreToRealityV2(emptyStore())
  const result = reconcileUserEvidence(store, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: SESSION,
    messageId: MSG,
  })
  assert(!result.idempotent, 'first message should not be idempotent')
  assert(result.changes.length > 0, 'should produce belief changes')
  const usersTested = getCurrentBelief(result.snapshot, 'founderos', 'validation.users_tested')
  assert(usersTested?.normalizedValue === 'true', 'users tested should be true')
  assert(result.snapshot.validationScore >= 45, 'validation score should increase')
  assert(result.snapshot.positioningRisk >= 50, 'positioning risk should be elevated')
  assert(
    result.responseMessage.includes('validation is no longer absent')
      || result.responseMessage.includes('tested'),
    'response should acknowledge testing',
  )
  assert(
    result.nextQuestion.toLowerCase().includes('words')
      || result.nextQuestion.toLowerCase().includes('screen'),
    'next question should target positioning',
  )
  console.log('PASS: five-tester statement updates validation and positioning')
}

function testClaimVariants() {
  const variants = [
    'I showed it to five people on the Home page. 3 out of 5 understood it.',
    'two were confused and thought it was a dashboard',
    'some people thought it was a dashboard',
  ]
  for (const text of variants) {
    const claims = extractClaimsFromText(text)
    assert(claims.length > 0, `claims from: ${text}`)
  }
  console.log('PASS: claim extraction supports statement variants')
}

function testIdempotentRepeat() {
  const store = migrateCognitiveStoreToRealityV2(emptyStore())
  const first = reconcileUserEvidence(store, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: SESSION,
    messageId: MSG,
  })
  const second = reconcileUserEvidence(first.store, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: SESSION,
    messageId: MSG,
  })
  assert(second.idempotent, 'repeat should be idempotent')
  assert(second.changes.length === 0, 'repeat should not duplicate changes')
  console.log('PASS: repeated identical message does not duplicate evidence')
}

function testContradiction() {
  const store = migrateCognitiveStoreToRealityV2(emptyStore())
  const first = reconcileUserEvidence(store, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: SESSION,
    messageId: 'msg-1',
  })
  const second = reconcileUserEvidence(first.store, {
    userMessage: 'Actually nobody has tested FounderOS yet. I was wrong.',
    sessionId: SESSION,
    messageId: 'msg-2',
  })
  const contra = second.store.worldModel.contradictions.length > 0
    || second.changes.some(c => c.newStatus === 'contradicted')
    || second.snapshot.activeBeliefs.some(b => b.predicate === 'validation.users_tested' && b.confidence < 50)
  assert(contra, 'contradictory message should reduce confidence or create contradiction')
  console.log('PASS: contradictory message creates contradiction or lowers confidence')
}

function testDetailVsBareYes() {
  const store = migrateCognitiveStoreToRealityV2(emptyStore())
  const bare = reconcileUserEvidence(store, {
    userMessage: 'yes',
    sessionId: SESSION,
    messageId: 'bare',
  })
  const detailed = reconcileUserEvidence(store, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: SESSION,
    messageId: 'detail',
  })
  const bareDelta = bare.changes[0]?.newConfidence ?? 0
  const detailBelief = detailed.snapshot.activeBeliefs.find(b => b.predicate === 'validation.users_tested')
  assert((detailBelief?.confidence ?? 0) > bareDelta, 'detailed answer should change confidence more than bare yes')
  console.log('PASS: detailed answer changes confidence more than bare yes')
}

function testHistoricalRetained() {
  const store = migrateCognitiveStoreToRealityV2(emptyStore())
  const result = reconcileUserEvidence(store, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: SESSION,
    messageId: MSG,
  })
  const superseded = result.store.worldModel.beliefs.find(b => b.reality?.supersededAt)
  assert(Boolean(superseded), 'historical inference should be retained as superseded')
  const activeAbsence = result.snapshot.activeBeliefs.find(b => /no stored validation/i.test(b.statement))
  assert(!activeAbsence, 'superseded inference should not be active truth')
  console.log('PASS: historical inference retained but not current truth')
}

function testNextQuestionChanges() {
  const store = migrateCognitiveStoreToRealityV2(emptyStore())
  const before = selectNextRealityQuestion(store.worldModel.realitySnapshot!)
  const after = reconcileUserEvidence(store, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: SESSION,
    messageId: MSG,
  })
  assert(after.nextQuestion !== before.text, 'next question should change after new evidence')
  console.log('PASS: next question changes based on what is known')
}

function testFounderSpecialistScoring() {
  const store = migrateCognitiveStoreToRealityV2(emptyStore())
  const reconciled = reconcileUserEvidence(store, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: SESSION,
    messageId: MSG,
  })
  const input: FounderInput = {
    objects: [],
    memories: [],
    knowledge: [],
    signals: [],
    outcomes: [],
    tasks: [],
    projects: [],
    worldModel: reconciled.store.worldModel,
  }
  const data = gatherFounderData(input)
  const scores = computeFounderScores(data, input)
  assert(scores.validationScore >= 45, 'founder specialist validation should increase')
  console.log('PASS: updated state affects founder specialist recommendations')
}

function testDecisionEngineScoring() {
  const store = migrateCognitiveStoreToRealityV2(emptyStore())
  const reconciled = reconcileUserEvidence(store, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: SESSION,
    messageId: MSG,
  })
  const breakdown = { strategicAlignment: 50, riskReduction: 50, momentum: 50, lowConfidencePenalty: 0 }
  applyWorldModelToDecisionScoring(breakdown, reconciled.store.worldModel, ['ux', 'copy'])
  assert(breakdown.strategicAlignment > 50, 'decision scoring should favor positioning after testing')
  console.log('PASS: updated state affects decision engine scoring')
}

function testArrayNormalization() {
  const store = normalizeCognitiveStore({
    worldModel: { ...createEmptyWorldModel(), beliefs: undefined as unknown as [] },
    timeline: undefined,
    realityMeta: { version: 2, processedMessageKeys: undefined as unknown as string[] } as never,
  })
  assert(Array.isArray(store.worldModel.beliefs), 'beliefs should be array')
  assert(Array.isArray(store.timeline), 'timeline should be array')
  console.log('PASS: undefined array inputs normalized safely')
}

function testLegacyMigration() {
  const legacy = normalizeCognitiveStore({
    worldModel: createEmptyWorldModel(),
    timeline: [],
    lastKernelSyncAt: null,
  })
  const migrated = migrateCognitiveStoreToRealityV2(legacy)
  assert(migrated.realityMeta?.version === 2, 'migration should set version 2')
  assert(Boolean(migrated.worldModel.realitySnapshot), 'migration should create snapshot')
  console.log('PASS: legacy cognitive-model data migrates successfully')
}

function testCompactionMeta() {
  const meta = compactRealityMeta({
    version: 2,
    processedMessageKeys: Array.from({ length: 300 }, (_, i) => `k-${i}`),
    lastCompactionAt: null,
    approximateBytes: 0,
    droppedArchiveCount: 0,
  })
  assert(meta.processedMessageKeys.length <= 200, 'processed keys should be capped')
  assert(meta.droppedArchiveCount > 0, 'dropped count should increment')
  console.log('PASS: compaction limits processed message keys')
}

function run() {
  testNoEvidenceProducesAbsenceInference()
  testFiveTesterStatement()
  testClaimVariants()
  testIdempotentRepeat()
  testContradiction()
  testDetailVsBareYes()
  testHistoricalRetained()
  testNextQuestionChanges()
  testFounderSpecialistScoring()
  testDecisionEngineScoring()
  testArrayNormalization()
  testLegacyMigration()
  testCompactionMeta()
  console.log('\nAll reality model tests passed.')
}

run()
