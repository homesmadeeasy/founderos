import type { EvaluationReport, EvaluationScenarioResult, EvaluationSummary } from './evaluationTypes'
import { aggregateDimensionScores, computeOverallScore } from './evaluationScoring'
import { loadLatestEvaluationSummary } from './evaluationStorage'

export function buildEvaluationSummary(report: EvaluationReport): EvaluationSummary {
  return {
    id: report.id,
    runAt: report.runAt,
    overallScore: report.overallScore,
    dimensionScores: report.dimensionScores,
    passed: report.passed,
    failed: report.failed,
    criticalFailures: report.criticalFailures,
    durationMs: report.durationMs,
  }
}

export function buildEvaluationReport(params: {
  scenarioResults: EvaluationScenarioResult[]
  durationMs: number
}): EvaluationReport {
  const previous = loadLatestEvaluationSummary()
  const overallScore = computeOverallScore(params.scenarioResults)
  const dimensionScores = aggregateDimensionScores(params.scenarioResults)
  const passed = params.scenarioResults.filter(r => r.passed).length
  const failed = params.scenarioResults.length - passed
  const criticalFailures = params.scenarioResults.filter(r => r.criticalFailed).length

  return {
    id: `eval-${Date.now().toString(36)}`,
    runAt: new Date().toISOString(),
    durationMs: params.durationMs,
    overallScore,
    dimensionScores,
    passed,
    failed,
    criticalFailures,
    scenarioResults: params.scenarioResults,
    previousRunComparison: previous
      ? {
        previousScore: previous.overallScore,
        delta: overallScore - previous.overallScore,
        previousRunAt: previous.runAt,
      }
      : undefined,
  }
}

export function formatEvaluationReportMarkdown(report: EvaluationReport): string {
  const lines = [
    `# Founder AI Evaluation Report`,
    ``,
    `Run: ${report.runAt}`,
    `Duration: ${report.durationMs}ms`,
    `Overall score: **${report.overallScore}/100**`,
    `Passed: ${report.passed} | Failed: ${report.failed} | Critical: ${report.criticalFailures}`,
    ``,
    `## Dimension scores`,
    ...Object.entries(report.dimensionScores).map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `## Scenarios`,
  ]

  for (const r of report.scenarioResults) {
    lines.push(`### ${r.passed ? 'PASS' : 'FAIL'} ${r.title} (${r.score})`)
    if (r.assertionFailures.length) {
      for (const f of r.assertionFailures) {
        lines.push(`- [${f.severity}] ${f.message}`)
      }
    }
  }

  return lines.join('\n')
}

export function exportReportJson(report: EvaluationReport): string {
  return JSON.stringify(report, null, 2)
}
