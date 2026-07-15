import type { EvaluationReport } from './evaluationTypes'

type KernelEmitter = (type: string, payload?: Record<string, unknown>) => void

let emitter: KernelEmitter | null = null

export function setEvaluationKernelEmitter(fn: KernelEmitter | null): void {
  emitter = fn
}

function emit(type: string, payload?: Record<string, unknown>): void {
  emitter?.(type, payload)
}

export function emitEvaluationStarted(scenarioCount: number): void {
  emit('FounderEvaluationStarted', { scenarioCount, at: new Date().toISOString() })
}

export function emitScenarioCompleted(
  scenarioId: string,
  passed: boolean,
  criticalFailed: boolean,
): void {
  emit('FounderEvaluationScenarioCompleted', { scenarioId, passed, criticalFailed })
}

export function emitEvaluationCompleted(report: EvaluationReport): void {
  emit('FounderEvaluationCompleted', {
    overallScore: report.overallScore,
    passed: report.passed,
    failed: report.failed,
    criticalFailures: report.criticalFailures,
    durationMs: report.durationMs,
  })
}

export function emitCriticalFailure(scenarioId: string, message: string): void {
  emit('FounderEvaluationCriticalFailure', { scenarioId, message })
}
