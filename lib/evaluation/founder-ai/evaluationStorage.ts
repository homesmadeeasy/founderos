import type { EvaluationReport, EvaluationSummary } from './evaluationTypes'

const STORAGE_KEY = 'founderos-founder-eval-summaries-v1'
const MAX_SUMMARIES = 5

function readSummaries(): EvaluationSummary[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EvaluationSummary[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SUMMARIES) : []
  } catch {
    return []
  }
}

function writeSummaries(summaries: EvaluationSummary[]): void {
  if (typeof window === 'undefined') return
  try {
    const compact = summaries.slice(0, MAX_SUMMARIES).map(s => ({
      id: s.id,
      runAt: s.runAt,
      overallScore: s.overallScore,
      dimensionScores: s.dimensionScores,
      passed: s.passed,
      failed: s.failed,
      criticalFailures: s.criticalFailures,
      durationMs: s.durationMs,
    }))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compact))
  } catch {
    // Quota-safe: drop oldest and retry once
    try {
      const trimmed = summaries.slice(0, Math.max(1, MAX_SUMMARIES - 1))
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      // Give up silently — full report remains in memory / export
    }
  }
}

export function saveEvaluationSummary(report: EvaluationReport): EvaluationSummary {
  const summary: EvaluationSummary = {
    id: report.id,
    runAt: report.runAt,
    overallScore: report.overallScore,
    dimensionScores: report.dimensionScores,
    passed: report.passed,
    failed: report.failed,
    criticalFailures: report.criticalFailures,
    durationMs: report.durationMs,
  }
  const existing = readSummaries().filter(s => s.id !== summary.id)
  writeSummaries([summary, ...existing])
  return summary
}

export function loadEvaluationSummaries(): EvaluationSummary[] {
  return readSummaries()
}

export function loadLatestEvaluationSummary(): EvaluationSummary | null {
  const all = readSummaries()
  return all[0] ?? null
}

export function clearEvaluationSummaries(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// In-memory full report for Evaluation Lab session (not persisted to localStorage)
let activeReport: EvaluationReport | null = null

export function setActiveEvaluationReport(report: EvaluationReport | null): void {
  activeReport = report
}

export function getActiveEvaluationReport(): EvaluationReport | null {
  return activeReport
}
