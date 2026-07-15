import type {
  EvaluationReport,
  EvaluationScenario,
  EvaluationScenarioResult,
  EvaluationSummary,
  EvaluationTurnTrace,
} from './evaluationTypes'
import { reconcileUserEvidence } from '@/lib/cognitive-model/realityReducer'
import { syncSessionBeliefsFromReconciliation } from '@/lib/cognitive-model/realityIntegration'
import { answerCognitiveQuery } from '@/lib/cognitive-model/cognitiveAssistant'
import { buildDeterministicFounderAIResponse } from '@/lib/ai/founder/founderAI.fallback'
import {
  createEvalHarness,
  buildEvalFounderInput,
  buildEvalSnapshot,
  simulatePageRefresh,
  nowMs,
} from './evaluationUtils'
import { runAssertions, resetAssertionCounter } from './evaluationAssertions'
import { scoreScenario } from './evaluationScoring'
import { buildRegressionSnapshot, registerBaselineSnapshot } from './evaluationSnapshots'
import { buildEvaluationReport, buildEvaluationSummary } from './evaluationReport'
import { ALL_EVALUATION_SCENARIOS } from './evaluationScenarios'
import { persistAfterRefreshAssertion } from './evaluationPersistenceChecks'

export interface EvaluationRunOptions {
  scenarioIds?: string[]
  registerBaselines?: boolean
  onScenarioComplete?: (result: EvaluationScenarioResult) => void
  emitKernelEvents?: boolean
}

function resolveTurnMessage(
  turn: EvaluationScenario['turns'][number],
  priorMessages: string[],
): string {
  if (turn.kind === 'repeat_previous' && turn.repeatTurnIndex != null) {
    return priorMessages[turn.repeatTurnIndex] ?? turn.userMessage
  }
  return turn.userMessage
}

export function runEvaluationScenario(
  scenario: EvaluationScenario,
  options?: Pick<EvaluationRunOptions, 'registerBaselines' | 'onScenarioComplete' | 'emitKernelEvents'>,
): EvaluationScenarioResult {
  resetAssertionCounter()
  const started = nowMs()
  const severity = scenario.severity ?? 'normal'
  const harness = createEvalHarness(scenario.initialState?.store)

  if (scenario.initialState?.seedMessage) {
    const seed = reconcileUserEvidence(harness.store, {
      userMessage: scenario.initialState.seedMessage,
      sessionId: harness.sessionId,
      messageId: `${scenario.id}-seed`,
    })
    harness.store = seed.store
  }

  const traces: EvaluationTurnTrace[] = []
  const priorMessages: string[] = []
  const messageIds: string[] = []
  let lastReconciliation = null as ReturnType<typeof reconcileUserEvidence> | null
  let lastResponse = null as ReturnType<typeof buildDeterministicFounderAIResponse>['response'] | null
  let lastQueryAnswer: string | null = null
  let refreshFailures: ReturnType<typeof persistAfterRefreshAssertion> = []

  for (let i = 0; i < scenario.turns.length; i++) {
    const turn = scenario.turns[i]
    const turnStart = nowMs()
    const userMessage = resolveTurnMessage(turn, priorMessages)
    priorMessages.push(userMessage)
    const repeatIndex = turn.kind === 'repeat_previous' ? (turn.repeatTurnIndex ?? 0) : i
    const messageId = turn.kind === 'repeat_previous' && messageIds[repeatIndex]
      ? messageIds[repeatIndex]
      : `${scenario.id}-turn-${i}`
    messageIds[i] = messageId

    if (turn.kind === 'query') {
      lastQueryAnswer = answerCognitiveQuery(harness.store, userMessage)
      const founderSnapshot = buildEvalSnapshot(harness)
      traces.push({
        turnIndex: i,
        userMessage,
        kind: 'query',
        queryAnswer: lastQueryAnswer ?? undefined,
        founderSnapshot: {
          bottleneck: founderSnapshot.mainBottleneck,
          recommendation: founderSnapshot.topRecommendation,
          validationScore: founderSnapshot.validationScore,
        },
        durationMs: nowMs() - turnStart,
      })
      continue
    }

    lastReconciliation = reconcileUserEvidence(harness.store, {
      userMessage,
      sessionId: harness.sessionId,
      messageId,
    })
    harness.store = lastReconciliation.store
    harness.session = syncSessionBeliefsFromReconciliation(harness.session, lastReconciliation, messageId)

    const input = buildEvalFounderInput(harness)
    const built = buildDeterministicFounderAIResponse({
      userMessage,
      session: harness.session,
      input,
      userName: 'Evaluator',
      worldModel: harness.store.worldModel,
      userTurnId: messageId,
      reconciliation: lastReconciliation,
    })
    lastResponse = built.response

    const founderSnapshot = buildEvalSnapshot(harness)
    traces.push({
      turnIndex: i,
      userMessage,
      kind: turn.kind ?? 'reconcile',
      reconciliation: {
        idempotent: lastReconciliation.idempotent,
        changesCount: lastReconciliation.changes.length,
        claimsCount: lastReconciliation.claims.length,
        validationDelta: lastReconciliation.validationDelta,
        evidenceIds: lastReconciliation.changes.flatMap(c => c.evidenceIds).slice(0, 8),
        beliefPredicates: lastReconciliation.snapshot.activeBeliefs.map(b => b.predicate).slice(0, 8),
      },
      responseSnippet: built.response.message.slice(0, 160),
      founderSnapshot: {
        bottleneck: founderSnapshot.mainBottleneck,
        recommendation: founderSnapshot.topRecommendation,
        validationScore: founderSnapshot.validationScore,
      },
      durationMs: nowMs() - turnStart,
    })
  }

  if (scenario.expected.persistAfterRefresh) {
    const refreshed = simulatePageRefresh(harness.store)
    harness.store = refreshed
    refreshFailures = persistAfterRefreshAssertion(scenario.expected, harness)
  }

  const founderSnapshot = buildEvalSnapshot(harness)
  const regression = buildRegressionSnapshot(harness.store, founderSnapshot)
  if (options?.registerBaselines) {
    registerBaselineSnapshot(scenario.id, regression)
  }

  const assertionFailures = [
    ...runAssertions({
      expectations: scenario.expected,
      harness,
      reconciliation: lastReconciliation,
      response: lastResponse,
      founderSnapshot,
      queryAnswer: lastQueryAnswer,
      scenarioSeverity: severity,
      traces,
    }),
    ...refreshFailures,
  ]

  const criticalFailed = assertionFailures.some(f => f.severity === 'critical')
  const { score, dimensionScores } = scoreScenario(assertionFailures, criticalFailed)

  const result: EvaluationScenarioResult = {
    scenarioId: scenario.id,
    title: scenario.title,
    category: scenario.category,
    severity,
    passed: assertionFailures.length === 0,
    criticalFailed,
    score,
    dimensionScores,
    assertionFailures,
    traces,
    durationMs: nowMs() - started,
    snapshotHash: regression.hash,
    actualState: {
      beliefs: regression.beliefs,
      contradictionCount: regression.contradictionCount,
      validationScore: regression.validationScore,
      bottleneck: regression.bottleneck,
      recommendation: regression.recommendation,
      nextQuestion: lastReconciliation?.nextQuestion ?? '',
    },
    lastResponse: lastResponse ?? undefined,
    lastReconciliation: lastReconciliation ?? undefined,
    lastFounderSnapshot: founderSnapshot,
  }

  if (options?.onScenarioComplete) {
    options.onScenarioComplete(result)
  }

  if (options?.emitKernelEvents && typeof window !== 'undefined') {
    void import('@/lib/evaluation/founder-ai/evaluationKernelEvents').then(m => {
      m.emitScenarioCompleted(scenario.id, result.passed, result.criticalFailed)
      if (result.criticalFailed) m.emitCriticalFailure(scenario.id, assertionFailures[0]?.message ?? 'critical')
    })
  }

  return result
}

export function runAllEvaluations(options?: EvaluationRunOptions): EvaluationReport {
  const started = nowMs()
  const scenarios = ALL_EVALUATION_SCENARIOS.filter(s =>
    !options?.scenarioIds?.length || options.scenarioIds.includes(s.id),
  )

  if (options?.emitKernelEvents && typeof window !== 'undefined') {
    void import('@/lib/evaluation/founder-ai/evaluationKernelEvents').then(m => m.emitEvaluationStarted(scenarios.length))
  }

  const scenarioResults = scenarios.map(s => runEvaluationScenario(s, options))
  const report = buildEvaluationReport({
    scenarioResults,
    durationMs: nowMs() - started,
  })

  if (options?.emitKernelEvents && typeof window !== 'undefined') {
    void import('@/lib/evaluation/founder-ai/evaluationKernelEvents').then(m => m.emitEvaluationCompleted(report))
  }

  return report
}

export function runFailedEvaluations(
  previous: EvaluationReport,
  options?: EvaluationRunOptions,
): EvaluationReport {
  const failedIds = previous.scenarioResults.filter(r => !r.passed).map(r => r.scenarioId)
  return runAllEvaluations({ ...options, scenarioIds: failedIds })
}

export function runProviderFallbackCheck(): EvaluationScenarioResult {
  return runEvaluationScenario({
    id: 'runtime-llm-fallback',
    title: 'Deterministic fallback when LLM unavailable',
    category: 'llm_fallback',
    turns: [{ userMessage: 'Five people tested the Home page. Three understood it.' }],
    expected: {
      llmMustUseFallback: true,
      beliefs: [{ predicate: 'validation.users_tested', normalizedValue: 'true', mustExist: true }],
    },
  })
}

export function toEvaluationSummary(report: EvaluationReport): EvaluationSummary {
  return buildEvaluationSummary(report)
}
