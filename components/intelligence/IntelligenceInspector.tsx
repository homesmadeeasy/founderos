'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useIntelligencePipeline } from '@/contexts/IntelligencePipelineContext'
import {
  getLastIntelligenceResult,
  subscribeIntelligenceResults,
  type IntelligenceResult,
  type StageStatus,
} from '@/lib/intelligence-pipeline'

function statusGlyph(status: StageStatus): string {
  if (status === 'ok') return '✓'
  if (status === 'failed') return '!'
  if (status === 'degraded') return '~'
  return '×'
}

function statusClass(status: StageStatus): string {
  if (status === 'ok') return 'text-emerald-700 bg-emerald-50 border-emerald-100'
  if (status === 'failed') return 'text-red-700 bg-red-50 border-red-100'
  if (status === 'degraded') return 'text-amber-800 bg-amber-50 border-amber-100'
  return 'text-zinc-500 bg-zinc-50 border-zinc-200'
}

export default function IntelligenceInspector() {
  const { lastResult: ctxResult, run } = useIntelligencePipeline()
  const [result, setResult] = useState<IntelligenceResult | null>(
    () => ctxResult ?? getLastIntelligenceResult(),
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => subscribeIntelligenceResults(setResult), [])
  useEffect(() => { setResult(ctxResult) }, [ctxResult])

  async function replaySample() {
    setBusy(true)
    try {
      await run(
        { specialistId: 'founder', question: 'What should I focus on today?', conversationContext: 'inspector' },
        { readOnly: true, produceResponse: (p) => p.reasoning || 'Inspector sample response.' },
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber-700">Developer only</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Intelligence Inspector</h1>
        <p className="text-sm text-zinc-600 max-w-2xl">
          Debug the canonical FounderOS intelligence pipeline. Ask Gym or Founder AI, then inspect
          the last structured result and stage trace here. Not a user-facing product surface.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => { void replaySample() }}
            className="min-h-11 px-3 rounded-xl bg-zinc-900 text-white text-sm disabled:opacity-50"
          >
            {busy ? 'Running…' : 'Run sample pipeline'}
          </button>
          <Link href="/gym" className="min-h-11 px-3 rounded-xl border border-zinc-200 text-sm inline-flex items-center">
            Open Gym AI
          </Link>
          <Link href="/founder" className="min-h-11 px-3 rounded-xl border border-zinc-200 text-sm inline-flex items-center">
            Open Founder AI
          </Link>
          <Link href="/evaluation" className="min-h-11 px-3 rounded-xl border border-zinc-200 text-sm inline-flex items-center">
            Evaluation Lab
          </Link>
        </div>
      </header>

      {!result ? (
        <p className="text-sm text-zinc-500">No intelligence run yet. Ask a specialist or run the sample.</p>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">Pipeline</h2>
            <p className="text-xs text-zinc-500">
              {result.trace.specialistId} · confidence {Math.round(result.confidence * 100)}% · {result.trace.durationMs}ms
            </p>
            <ul className="grid sm:grid-cols-2 gap-2">
              {result.trace.stages.map(stage => (
                <li
                  key={`${stage.id}-${stage.durationMs}-${stage.status}`}
                  className={`rounded-xl border px-3 py-2 text-sm flex items-start gap-2 ${statusClass(stage.status)}`}
                >
                  <span className="font-mono text-xs mt-0.5">{statusGlyph(stage.status)}</span>
                  <div className="min-w-0">
                    <p className="font-medium">{stage.label}</p>
                    <p className="text-xs opacity-80 truncate">{stage.detail ?? stage.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
              <h2 className="text-sm font-semibold">Inputs / summaries</h2>
              <p className="text-xs text-zinc-500">Question</p>
              <p className="text-sm">{result.trace.question}</p>
              <p className="text-xs text-zinc-500 pt-2">Identity</p>
              <p className="text-sm">{result.identitySummary}</p>
              <p className="text-xs text-zinc-500 pt-2">Reality</p>
              <p className="text-sm">{result.realitySummary}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
              <h2 className="text-sm font-semibold">Reasoning / decision</h2>
              <p className="text-sm whitespace-pre-wrap">{result.reasoning}</p>
              <p className="text-xs text-zinc-500 pt-2">Explanation</p>
              <p className="text-sm">{result.explanation}</p>
              <p className="text-xs text-zinc-500 pt-2">Missing</p>
              <p className="text-sm">{result.missingInformation.join(', ') || 'None'}</p>
            </div>
          </section>

          <section className="grid lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-semibold mb-2">Memories</h2>
              <ul className="space-y-2 text-sm">
                {result.relevantMemories.length === 0 && <li className="text-zinc-500">None</li>}
                {result.relevantMemories.map(m => (
                  <li key={m.id}><span className="font-medium">{m.title}</span><br /><span className="text-xs text-zinc-500">{m.summary}</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-semibold mb-2">Beliefs</h2>
              <ul className="space-y-2 text-sm">
                {result.relevantBeliefs.length === 0 && <li className="text-zinc-500">None</li>}
                {result.relevantBeliefs.map(b => (
                  <li key={b.id}>{b.statement} <span className="text-xs text-zinc-500">({Math.round(b.confidence * 100)}%)</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-semibold mb-2">Evidence</h2>
              <ul className="space-y-2 text-sm">
                {result.supportingEvidence.length === 0 && <li className="text-zinc-500">None</li>}
                {result.supportingEvidence.map(e => (
                  <li key={e.id}><span className="font-medium">{e.title}</span><br /><span className="text-xs text-zinc-500">{e.summary}</span></li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
            <h2 className="text-sm font-semibold">Recommended actions</h2>
            <ul className="space-y-1 text-sm">
              {result.recommendedActions.length === 0 && <li className="text-zinc-500">None</li>}
              {result.recommendedActions.map(a => (
                <li key={a.id}>{a.label} — <span className="text-zinc-500">{a.rationale}</span></li>
              ))}
            </ul>
            <h2 className="text-sm font-semibold pt-3">Final response</h2>
            <pre className="text-sm whitespace-pre-wrap font-sans bg-zinc-50 rounded-xl p-3 border border-zinc-100">
              {result.response || '(empty)'}
            </pre>
          </section>
        </>
      )}
    </div>
  )
}
