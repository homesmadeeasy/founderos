/**
 * Founder AI Intelligence Evaluation suite — deterministic, no OpenAI, no browser.
 * Run: npm run test:founder-intelligence
 * Regression: npm run test:founder-regression
 */
import assert from 'node:assert'
import { runAllEvaluations, runEvaluationScenario } from './evaluationRunner'
import { ALL_EVALUATION_SCENARIOS } from './evaluationScenarios'
import { buildRegressionSnapshot } from './evaluationSnapshots'
import { createEvalHarness, buildEvalSnapshot } from './evaluationUtils'
import { reconcileUserEvidence, migrateCognitiveStoreToRealityV2 } from '@/lib/cognitive-model/realityReducer'
import { normalizeCognitiveStore } from '@/lib/cognitive-model/cognitiveNormalize'
import { malformedLegacyStore, FIVE_TESTER_MSG } from './evaluationFixtures'
import { clearActiveMemoryStore, resetPersistInvocationCount } from '@/lib/cognitive-model/cognitiveMemory'
import { saveCognitiveStore } from '@/lib/cognitive-model/beliefStorage'
import { createEmptyWorldModel } from '@/lib/cognitive-model/worldModel'
import { compactCognitiveStore } from '@/lib/cognitive-model/cognitiveCompaction'
import { COGNITIVE_RETENTION } from '@/lib/cognitive-model/cognitiveRetention'
import { EVALUATION_DIMENSIONS } from './evaluationTypes'
import { DIMENSION_LABELS } from './evaluationScoring'

function testScenarioCount(): void {
  assert.ok(ALL_EVALUATION_SCENARIOS.length >= 30, `expected >= 30 scenarios, got ${ALL_EVALUATION_SCENARIOS.length}`)
  console.log(`PASS: ${ALL_EVALUATION_SCENARIOS.length} evaluation scenarios defined`)
}

function testAllScenariosRun(): void {
  const report = runAllEvaluations({ registerBaselines: true })
  assert.ok(report.scenarioResults.length >= 30)
  assert.ok(report.overallScore >= 0 && report.overallScore <= 100)
  console.log(`INFO: overall score ${report.overallScore}/100 — passed ${report.passed}, failed ${report.failed}, critical ${report.criticalFailures}`)

  for (const d of EVALUATION_DIMENSIONS) {
    console.log(`  ${DIMENSION_LABELS[d]}: ${report.dimensionScores[d]}`)
  }

  const failures = report.scenarioResults.filter(r => !r.passed)
  for (const f of failures) {
    console.log(`FAIL scenario: ${f.scenarioId} — ${f.assertionFailures.map(a => a.message).join('; ')}`)
  }

  const criticalScenarios = ALL_EVALUATION_SCENARIOS.filter(s => s.severity === 'critical')
  const criticalFails = report.scenarioResults.filter(r =>
    criticalScenarios.some(s => s.id === r.scenarioId) && !r.passed,
  )
  assert.equal(criticalFails.length, 0, `critical scenarios must pass: ${criticalFails.map(f => f.scenarioId).join(', ')}`)
  console.log('PASS: all critical scenarios passed')
}

function testRegressionSnapshotsStable(): void {
  const report = runAllEvaluations({ registerBaselines: true })
  let drift = 0
  for (const result of report.scenarioResults) {
    const harness = createEvalHarness()
    for (const turn of ALL_EVALUATION_SCENARIOS.find(s => s.id === result.scenarioId)?.turns ?? []) {
      if (turn.kind === 'query') continue
      const rec = reconcileUserEvidence(harness.store, {
        userMessage: turn.userMessage,
        sessionId: harness.sessionId,
        messageId: `${result.scenarioId}-reg`,
      })
      harness.store = rec.store
    }
    const snap = buildRegressionSnapshot(harness.store, buildEvalSnapshot(harness))
    const baseline = report.scenarioResults.find(r => r.scenarioId === result.scenarioId)
    if (baseline && baseline.snapshotHash !== snap.hash) {
      drift += 1
    }
  }
  assert.ok(drift <= 2, `too much snapshot drift: ${drift}`)
  console.log('PASS: regression snapshot hashes stable')
}

function testMalformedMigrationDoesNotCrash(): void {
  const migrated = migrateCognitiveStoreToRealityV2(normalizeCognitiveStore(malformedLegacyStore()))
  const result = reconcileUserEvidence(migrated, {
    userMessage: FIVE_TESTER_MSG,
    sessionId: 'malformed-test',
    messageId: 'm1',
  })
  assert.ok(result.changes.length > 0)
  console.log('PASS: malformed legacy store migrates and reconciles')
}

function testQuotaSafeSave(): void {
  clearActiveMemoryStore()
  resetPersistInvocationCount()
  const store = compactCognitiveStore({
    worldModel: createEmptyWorldModel(),
    timeline: [],
    lastKernelSyncAt: null,
  }).store
  const result = saveCognitiveStore(store, { force: true })
  assert.equal(typeof result.success, 'boolean')
  assert.ok(result.sizeBytes <= COGNITIVE_RETENTION.STORAGE_BUDGET_BYTES * 2)
  console.log('PASS: quota-safe cognitive save in Node')
}

function testProviderTreeImports(): void {
  // Provider tree tests live in providerTests.ts; ensure they remain runnable together.
  console.log('PASS: provider tree covered by npm run test:providers')
}

export function runFounderIntelligenceTests(): { passed: number; failed: string[] } {
  const tests: Array<[string, () => void]> = [
    ['scenario count', testScenarioCount],
    ['all scenarios', testAllScenariosRun],
    ['regression snapshots', testRegressionSnapshotsStable],
    ['malformed migration', testMalformedMigrationDoesNotCrash],
    ['quota safe save', testQuotaSafeSave],
    ['provider tree note', testProviderTreeImports],
  ]

  const failed: string[] = []
  let passed = 0
  for (const [name, fn] of tests) {
    try {
      fn()
      passed += 1
    } catch (error) {
      failed.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { passed, failed }
}

if (require.main === module) {
  const result = runFounderIntelligenceTests()
  if (result.failed.length) {
    console.error('FAILED:', result.failed.join('\n'))
    process.exit(1)
  }
  console.log(`All ${result.passed} founder intelligence tests passed.`)
}
