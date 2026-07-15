'use client'

import Card from '@/components/home/Card'
import type { EvaluationScenario, EvaluationScenarioResult } from '@/lib/evaluation/founder-ai/evaluationTypes'

interface Props {
  scenario: EvaluationScenario
  result: EvaluationScenarioResult
}

export default function EvaluationScenarioDetail({ scenario, result }: Props) {
  return (
    <Card className="p-5 space-y-4 text-sm">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">{result.category}</p>
        <h3 className="text-base font-semibold text-zinc-900 mt-0.5">{result.title}</h3>
        <p className="text-xs text-zinc-500 mt-1">
          {result.passed ? 'Passed' : 'Failed'} · Score {result.score} · {result.durationMs}ms
          {result.criticalFailed ? ' · Critical failure' : ''}
        </p>
      </div>

      {result.assertionFailures.length > 0 && (
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
          <p className="text-xs font-semibold text-rose-700 mb-2">Assertion failures</p>
          <ul className="space-y-1 text-xs text-rose-800">
            {result.assertionFailures.map(f => (
              <li key={f.id}>[{f.severity}] {f.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-zinc-700 mb-1">Conversation turns</p>
        <ol className="space-y-2 text-xs text-zinc-600">
          {scenario.turns.map((t, i) => (
            <li key={i} className="rounded-lg bg-zinc-50 px-2 py-1.5">
              <span className="text-zinc-400">{t.kind ?? 'reconcile'}: </span>
              {t.userMessage.slice(0, 120)}{t.userMessage.length > 120 ? '…' : ''}
            </li>
          ))}
          {scenario.turns.length === 0 && <li className="text-zinc-400">Empty store baseline only</li>}
        </ol>
      </div>

      <div>
        <p className="text-xs font-semibold text-zinc-700 mb-1">Actual beliefs</p>
        <ul className="space-y-1 text-xs text-zinc-600">
          {result.actualState.beliefs.map(b => (
            <li key={b.predicate}>{b.predicate} = {b.normalizedValue} ({b.confidence}%)</li>
          ))}
          {result.actualState.beliefs.length === 0 && <li className="text-zinc-400">No active reality beliefs</li>}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-zinc-100 p-2">
          <p className="text-zinc-400">Bottleneck</p>
          <p className="text-zinc-800 font-medium">{result.actualState.bottleneck}</p>
        </div>
        <div className="rounded-lg border border-zinc-100 p-2">
          <p className="text-zinc-400">Validation</p>
          <p className="text-zinc-800 font-medium">{result.actualState.validationScore}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-zinc-700 mb-1">Recommendation</p>
        <p className="text-xs text-zinc-600">{result.actualState.recommendation}</p>
      </div>

      {result.actualState.nextQuestion && (
        <div>
          <p className="text-xs font-semibold text-zinc-700 mb-1">Next question</p>
          <p className="text-xs text-zinc-600">{result.actualState.nextQuestion}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-zinc-700 mb-1">Diagnostic traces</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {result.traces.map(t => (
            <div key={t.turnIndex} className="rounded-lg bg-zinc-50 p-2 text-[11px] text-zinc-600 font-mono">
              <p>turn {t.turnIndex} · {t.durationMs}ms</p>
              {t.reconciliation && (
                <p>changes={t.reconciliation.changesCount} idempotent={String(t.reconciliation.idempotent)} evidence={t.reconciliation.evidenceIds.join(',')}</p>
              )}
              {t.queryAnswer && <p>query: {t.queryAnswer.slice(0, 100)}</p>}
              {t.responseSnippet && <p>response: {t.responseSnippet}</p>}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-zinc-400">Snapshot {result.snapshotHash} — structured state only, no chain-of-thought.</p>
    </Card>
  )
}
