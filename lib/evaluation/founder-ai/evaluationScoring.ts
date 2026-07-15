import type {
  EvaluationAssertionFailure,
  EvaluationDimension,
  EvaluationScenarioResult,
} from './evaluationTypes'
import { EVALUATION_DIMENSIONS } from './evaluationTypes'
import { failuresForDimension } from './evaluationAssertions'

const DIMENSION_WEIGHTS: Record<EvaluationDimension, number> = {
  factualConsistency: 1.2,
  beliefUpdating: 1.1,
  evidenceGrounding: 1.0,
  uncertaintyHonesty: 1.1,
  recommendationRelevance: 1.0,
  questionQuality: 0.9,
  persistence: 1.1,
  idempotency: 1.0,
  safety: 1.3,
}

export function scoreDimension(
  dimension: EvaluationDimension,
  failures: EvaluationAssertionFailure[],
  scenarioPassed: boolean,
): number {
  const dimFailures = failuresForDimension(failures, dimension)
  if (dimFailures.some(f => f.severity === 'critical')) return 0
  if (dimFailures.length === 0 && scenarioPassed) return 100
  if (dimFailures.length === 0) return 95
  const penalty = Math.min(100, dimFailures.length * 25)
  return Math.max(0, 100 - penalty)
}

export function scoreScenario(
  failures: EvaluationAssertionFailure[],
  criticalFailed: boolean,
): { score: number; dimensionScores: Record<EvaluationDimension, number> } {
  const passed = failures.length === 0
  const dimensionScores = Object.fromEntries(
    EVALUATION_DIMENSIONS.map(d => [d, scoreDimension(d, failures, passed)]),
  ) as Record<EvaluationDimension, number>

  if (criticalFailed) {
    for (const d of EVALUATION_DIMENSIONS) {
      if (failuresForDimension(failures, d).some(f => f.severity === 'critical')) {
        dimensionScores[d] = 0
      }
    }
  }

  const weighted = EVALUATION_DIMENSIONS.reduce((sum, d) => sum + dimensionScores[d] * DIMENSION_WEIGHTS[d], 0)
  const weightTotal = EVALUATION_DIMENSIONS.reduce((sum, d) => sum + DIMENSION_WEIGHTS[d], 0)
  const score = criticalFailed && failures.some(f => f.severity === 'critical')
    ? Math.min(40, Math.round(weighted / weightTotal))
    : Math.round(weighted / weightTotal)

  return { score, dimensionScores }
}

export function aggregateDimensionScores(
  results: EvaluationScenarioResult[],
): Record<EvaluationDimension, number> {
  const totals = Object.fromEntries(EVALUATION_DIMENSIONS.map(d => [d, 0])) as Record<EvaluationDimension, number>
  if (results.length === 0) return totals
  for (const r of results) {
    for (const d of EVALUATION_DIMENSIONS) {
      totals[d] += r.dimensionScores[d]
    }
  }
  return Object.fromEntries(
    EVALUATION_DIMENSIONS.map(d => [d, Math.round(totals[d] / results.length)]),
  ) as Record<EvaluationDimension, number>
}

export function computeOverallScore(results: EvaluationScenarioResult[]): number {
  if (results.length === 0) return 0
  const criticalCount = results.filter(r => r.criticalFailed).length
  const avg = results.reduce((s, r) => s + r.score, 0) / results.length
  if (criticalCount > 0) {
    return Math.round(Math.min(avg, 100 - criticalCount * 8))
  }
  return Math.round(avg)
}

export const DIMENSION_LABELS: Record<EvaluationDimension, string> = {
  factualConsistency: 'Factual consistency',
  beliefUpdating: 'Belief updating',
  evidenceGrounding: 'Evidence grounding',
  uncertaintyHonesty: 'Uncertainty honesty',
  recommendationRelevance: 'Recommendation relevance',
  questionQuality: 'Question quality',
  persistence: 'Persistence',
  idempotency: 'Idempotency',
  safety: 'Safety',
}
