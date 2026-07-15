import type { EvaluationAssertionFailure, EvaluationExpectations } from './evaluationTypes'
import type { EvalHarness } from './evaluationUtils'
import { getCurrentBelief } from '@/lib/cognitive-model/realityQueries'

export function persistAfterRefreshAssertion(
  expectations: EvaluationExpectations,
  harness: EvalHarness,
): EvaluationAssertionFailure[] {
  if (!expectations.persistAfterRefresh) return []
  const failures: EvaluationAssertionFailure[] = []
  const snapshot = harness.store.worldModel.realitySnapshot
  if (!snapshot) {
    failures.push({
      id: 'persist-no-snapshot',
      message: 'Reality snapshot missing after simulated refresh',
      severity: 'critical',
      dimension: 'persistence',
      expected: 'snapshot',
      actual: 'none',
    })
    return failures
  }

  for (const belief of expectations.beliefs ?? []) {
    if (belief.mustNotExist) continue
    const current = getCurrentBelief(snapshot, 'founderos', belief.predicate)
    if (!current) {
      failures.push({
        id: `persist-missing-${belief.predicate}`,
        message: `Belief ${belief.predicate} lost after refresh`,
        severity: 'critical',
        dimension: 'persistence',
        expected: belief.predicate,
        actual: 'none',
      })
      continue
    }
    if (belief.normalizedValue && current.normalizedValue !== belief.normalizedValue) {
      failures.push({
        id: `persist-value-${belief.predicate}`,
        message: `Belief ${belief.predicate} value changed after refresh`,
        severity: 'critical',
        dimension: 'persistence',
        expected: belief.normalizedValue,
        actual: current.normalizedValue,
      })
    }
  }

  return failures
}
