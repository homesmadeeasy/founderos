import type {
  EvaluationAssertionFailure,
  EvaluationDimension,
  EvaluationExpectations,
  EvaluationSeverity,
  EvaluationTurnTrace,
} from './evaluationTypes'
import type { EvalHarness } from './evaluationUtils'
import { collectStructuredText } from './evaluationUtils'
import type { ReconciliationResult } from '@/lib/cognitive-model/realityTypes'
import type { FounderAIResponse } from '@/lib/ai/founder/founderAI.types'
import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import { getCurrentBelief } from '@/lib/cognitive-model/realityQueries'

let failureCounter = 0

export function resetAssertionCounter(): void {
  failureCounter = 0
}

function fail(
  message: string,
  dimension: EvaluationDimension,
  severity: EvaluationSeverity,
  expected?: string,
  actual?: string,
): EvaluationAssertionFailure {
  failureCounter += 1
  return {
    id: `assert-${failureCounter}`,
    message,
    severity,
    dimension,
    expected,
    actual,
  }
}

export function runAssertions(params: {
  expectations: EvaluationExpectations
  harness: EvalHarness
  reconciliation: ReconciliationResult | null
  response: FounderAIResponse | null
  founderSnapshot: FounderSnapshot | null
  queryAnswer: string | null
  scenarioSeverity: EvaluationSeverity
  traces: EvaluationTurnTrace[]
}): EvaluationAssertionFailure[] {
  const failures: EvaluationAssertionFailure[] = []
  const { expectations, harness, reconciliation, response, founderSnapshot, queryAnswer, scenarioSeverity } = params
  const snapshot = harness.store.worldModel.realitySnapshot
  const critical = scenarioSeverity === 'critical'

  for (const belief of expectations.beliefs ?? []) {
    const current = snapshot
      ? getCurrentBelief(snapshot, 'founderos', belief.predicate)
      : null
    if (belief.mustNotExist) {
      if (current) {
        failures.push(fail(
          `Belief ${belief.predicate} should not exist`,
          'factualConsistency',
          critical ? 'critical' : 'normal',
          'absent',
          current.normalizedValue,
        ))
      }
      continue
    }
    if (belief.mustExist !== false && !current) {
      failures.push(fail(
        `Missing belief predicate ${belief.predicate}`,
        'beliefUpdating',
        critical ? 'critical' : 'normal',
        belief.predicate,
        'none',
      ))
      continue
    }
    if (!current) continue
    if (belief.normalizedValue && current.normalizedValue !== belief.normalizedValue) {
      failures.push(fail(
        `Belief ${belief.predicate} value mismatch`,
        'beliefUpdating',
        critical ? 'critical' : 'normal',
        belief.normalizedValue,
        current.normalizedValue,
      ))
    }
    if (belief.minConfidence != null && current.confidence < belief.minConfidence) {
      failures.push(fail(
        `Belief ${belief.predicate} confidence too low`,
        'beliefUpdating',
        'normal',
        `>= ${belief.minConfidence}`,
        String(current.confidence),
      ))
    }
    if (belief.maxConfidence != null && current.confidence > belief.maxConfidence) {
      failures.push(fail(
        `Belief ${belief.predicate} confidence too high`,
        'uncertaintyHonesty',
        critical ? 'critical' : 'normal',
        `<= ${belief.maxConfidence}`,
        String(current.confidence),
      ))
    }
    if (belief.sourceClassification && current.sourceClassification !== belief.sourceClassification) {
      failures.push(fail(
        `Belief ${belief.predicate} source mismatch`,
        'evidenceGrounding',
        'normal',
        belief.sourceClassification,
        current.sourceClassification,
      ))
    }
  }

  if (expectations.validationScoreMin != null && snapshot) {
    if (snapshot.validationScore < expectations.validationScoreMin) {
      failures.push(fail(
        'Validation score below minimum',
        'recommendationRelevance',
        'normal',
        `>= ${expectations.validationScoreMin}`,
        String(snapshot.validationScore),
      ))
    }
  }
  if (expectations.validationScoreMax != null && snapshot) {
    if (snapshot.validationScore > expectations.validationScoreMax) {
      failures.push(fail(
        'Validation score above maximum',
        'factualConsistency',
        'normal',
        `<= ${expectations.validationScoreMax}`,
        String(snapshot.validationScore),
      ))
    }
  }
  if (expectations.positioningRiskMin != null && snapshot) {
    if (snapshot.positioningRisk < expectations.positioningRiskMin) {
      failures.push(fail(
        'Positioning risk below minimum',
        'recommendationRelevance',
        'normal',
        `>= ${expectations.positioningRiskMin}`,
        String(snapshot.positioningRisk),
      ))
    }
  }

  const bottleneck = founderSnapshot?.mainBottleneck ?? 'None'
  if (expectations.bottleneck) {
    const allowed = Array.isArray(expectations.bottleneck) ? expectations.bottleneck : [expectations.bottleneck]
    if (!allowed.includes(bottleneck)) {
      failures.push(fail(
        'Bottleneck mismatch',
        'recommendationRelevance',
        critical ? 'critical' : 'normal',
        allowed.join(' | '),
        bottleneck,
      ))
    }
  }
  if (expectations.bottleneckNot) {
    const blocked = Array.isArray(expectations.bottleneckNot) ? expectations.bottleneckNot : [expectations.bottleneckNot]
    if (blocked.includes(bottleneck)) {
      failures.push(fail(
        'Bottleneck should have shifted away',
        'recommendationRelevance',
        critical ? 'critical' : 'normal',
        `not ${blocked.join(' | ')}`,
        bottleneck,
      ))
    }
  }

  const recommendation = (founderSnapshot?.topRecommendation ?? '').toLowerCase()
  for (const phrase of expectations.recommendationIncludes ?? []) {
    if (!recommendation.includes(phrase.toLowerCase())) {
      failures.push(fail(
        `Recommendation missing "${phrase}"`,
        'recommendationRelevance',
        critical ? 'critical' : 'normal',
        phrase,
        founderSnapshot?.topRecommendation ?? '',
      ))
    }
  }
  for (const phrase of expectations.recommendationExcludes ?? []) {
    if (recommendation.includes(phrase.toLowerCase())) {
      failures.push(fail(
        `Recommendation should not include "${phrase}"`,
        'recommendationRelevance',
        'normal',
        `exclude ${phrase}`,
        founderSnapshot?.topRecommendation ?? '',
      ))
    }
  }

  const nextQuestion = (reconciliation?.nextQuestion ?? '').toLowerCase()
  for (const phrase of expectations.nextQuestionIncludes ?? []) {
    if (!nextQuestion.includes(phrase.toLowerCase())) {
      failures.push(fail(
        `Next question missing "${phrase}"`,
        'questionQuality',
        'normal',
        phrase,
        reconciliation?.nextQuestion ?? '',
      ))
    }
  }
  for (const phrase of expectations.nextQuestionExcludes ?? []) {
    if (nextQuestion.includes(phrase.toLowerCase())) {
      failures.push(fail(
        `Next question should not include "${phrase}"`,
        'questionQuality',
        'normal',
        `exclude ${phrase}`,
        reconciliation?.nextQuestion ?? '',
      ))
    }
  }

  if (expectations.contradictionCountMin != null) {
    const count = harness.store.worldModel.contradictions.filter(c => !c.resolved).length
      + (snapshot?.contradictions.length ?? 0)
    if (count < expectations.contradictionCountMin) {
      failures.push(fail(
        'Insufficient visible contradictions',
        'factualConsistency',
        critical ? 'critical' : 'normal',
        `>= ${expectations.contradictionCountMin}`,
        String(count),
      ))
    }
  }

  if (expectations.unknownCountMin != null && snapshot) {
    if (snapshot.biggestUnknowns.length < expectations.unknownCountMin) {
      failures.push(fail(
        'Insufficient unknowns surfaced',
        'uncertaintyHonesty',
        'normal',
        `>= ${expectations.unknownCountMin}`,
        String(snapshot.biggestUnknowns.length),
      ))
    }
  }

  if (expectations.changesCountMin != null && reconciliation) {
    if (reconciliation.changes.length < expectations.changesCountMin) {
      failures.push(fail(
        'Insufficient belief changes',
        'beliefUpdating',
        'normal',
        `>= ${expectations.changesCountMin}`,
        String(reconciliation.changes.length),
      ))
    }
  }
  if (expectations.changesCountMax != null && reconciliation) {
    if (reconciliation.changes.length > expectations.changesCountMax) {
      failures.push(fail(
        'Too many belief changes (possible duplication)',
        'idempotency',
        critical ? 'critical' : 'normal',
        `<= ${expectations.changesCountMax}`,
        String(reconciliation.changes.length),
      ))
    }
  }

  const structured = collectStructuredText(harness.store, response?.message)
  for (const phrase of expectations.forbiddenClaimPhrases ?? []) {
    if (structured.includes(phrase.toLowerCase())) {
      failures.push(fail(
        `Forbidden claim phrase "${phrase}"`,
        'safety',
        'critical',
        'absent',
        phrase,
      ))
    }
  }
  for (const phrase of expectations.forbiddenOutputs ?? []) {
    const msg = (response?.message ?? queryAnswer ?? '').toLowerCase()
    if (msg.includes(phrase.toLowerCase())) {
      failures.push(fail(
        `Forbidden output phrase "${phrase}"`,
        'safety',
        'critical',
        'absent',
        phrase,
      ))
    }
  }

  if (expectations.uncertaintyInResponse) {
    const msg = (response?.message ?? reconciliation?.responseMessage ?? '').toLowerCase()
    const uncertain = /uncertain|not sure|don't have|do not have|no confirmed|no evidence|need more|need a bit more detail|absence of evidence|cannot conclude|before updating my view/i.test(msg)
      || (response?.unknowns?.length ?? 0) > 0
      || (reconciliation?.unknowns.length ?? 0) > 0
    if (!uncertain) {
      failures.push(fail(
        'Response should express uncertainty',
        'uncertaintyHonesty',
        critical ? 'critical' : 'normal',
        'uncertainty language',
        response?.message ?? '',
      ))
    }
  }

  if (expectations.cognitiveQuery) {
    const answer = (queryAnswer ?? '').toLowerCase()
    for (const phrase of expectations.cognitiveQuery.mustInclude ?? []) {
      if (!answer.includes(phrase.toLowerCase())) {
        failures.push(fail(
          `Query answer missing "${phrase}"`,
          'recommendationRelevance',
          critical ? 'critical' : 'normal',
          phrase,
          queryAnswer ?? '',
        ))
      }
    }
    for (const phrase of expectations.cognitiveQuery.mustNotInclude ?? []) {
      if (answer.includes(phrase.toLowerCase())) {
        failures.push(fail(
          `Query answer must not include "${phrase}"`,
          'safety',
          'critical',
          `exclude ${phrase}`,
          queryAnswer ?? '',
        ))
      }
    }
  }

  if (expectations.supersededHistoryRetained) {
    const superseded = harness.store.worldModel.beliefs.some(b => b.reality?.supersededAt)
    if (!superseded) {
      failures.push(fail(
        'Superseded belief history should be retained',
        'beliefUpdating',
        'normal',
        'superseded belief in store',
        'none',
      ))
    }
  }

  if (expectations.evidenceForPredicate && snapshot) {
    const belief = getCurrentBelief(snapshot, 'founderos', expectations.evidenceForPredicate)
    const hasEvidence = (belief?.supportingEvidence.length ?? 0) > 0
      || reconciliation?.changes.some(c => c.evidenceIds.length > 0)
    if (!hasEvidence) {
      failures.push(fail(
        `Missing evidence for ${expectations.evidenceForPredicate}`,
        'evidenceGrounding',
        'normal',
        'evidence ids',
        'none',
      ))
    }
  }

  if (expectations.idempotentOnFinalTurn && reconciliation?.idempotent !== true) {
    failures.push(fail(
      'Final turn should be idempotent',
      'idempotency',
      critical ? 'critical' : 'normal',
      'idempotent',
      String(reconciliation?.idempotent),
    ))
  }

  if (expectations.llmMustUseFallback && response && !response.usedDeterministicFallback) {
    failures.push(fail(
      'Expected deterministic fallback path',
      'safety',
      'normal',
      'usedDeterministicFallback=true',
      String(response.usedDeterministicFallback),
    ))
  }

  return failures
}

export function failuresForDimension(
  failures: EvaluationAssertionFailure[],
  dimension: EvaluationDimension,
): EvaluationAssertionFailure[] {
  return failures.filter(f => f.dimension === dimension)
}
