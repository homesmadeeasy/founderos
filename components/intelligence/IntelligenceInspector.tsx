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

function isInspectorEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('founderos-intelligence-inspector') === '1'
  }
  return false
}

export default function IntelligenceInspector() {
  const enabled = isInspectorEnabled()
  const { lastResult: ctxResult, run } = useIntelligencePipeline()
  const [subscribed, setSubscribed] = useState<IntelligenceResult | null>(
    () => getLastIntelligenceResult(),
  )
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const result = ctxResult ?? subscribed

  useEffect(() => subscribeIntelligenceResults(setSubscribed), [])

  if (!enabled) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-zinc-600">
        Intelligence Inspector is developer-only. Enable in production with
        localStorage key <code className="text-xs">founderos-intelligence-inspector=1</code>.
      </div>
    )
  }

  async function replayGymSample() {
    setBusy(true)
    try {
      await run(
        {
          requestId: `inspector-gym-${Date.now()}`,
          specialist: 'gym',
          intent: 'train_today',
          userMessage: 'What should I train today?',
          conversationContext: 'inspector',
          readOnly: true,
        },
        {
          readOnly: true,
          declaredProfile: [
            { key: 'training_goal', label: 'Training goal', value: 'Build muscle', source: 'gym_profile' },
          ],
          domainEvidence: [
            {
              id: 'sample',
              title: 'Sample plan',
              summary: 'Inspector sample domain evidence',
              weight: 0.7,
              source: 'gym',
              kind: 'domain',
              freshness: 'unknown',
            },
          ],
          produceResponse: (p) =>
            `Inspector sample · readiness=${p.responseContext.readiness ?? 'n/a'} · missing=${p.missingInformation.join(', ') || 'none'}`,
        },
      )
    } finally {
      setBusy(false)
    }
  }

  async function copyReport() {
    if (!result) return
    await navigator.clipboard.writeText(result.trace.sanitizedReport)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const ctx = result?.responseContext

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber-700">Developer only</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Intelligence Inspector</h1>
        <p className="text-sm text-zinc-600 max-w-2xl">
          Shows what the canonical pipeline actually used for the last specialist run (Gym reference flow).
          No secrets, API keys, or hidden prompts.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => { void replayGymSample() }}
            className="min-h-11 px-3 rounded-xl bg-zinc-900 text-white text-sm disabled:opacity-50"
          >
            {busy ? 'Running…' : 'Run Gym sample (read-only)'}
          </button>
          <button
            type="button"
            disabled={!result}
            onClick={() => { void copyReport() }}
            className="min-h-11 px-3 rounded-xl border border-zinc-200 text-sm disabled:opacity-50"
          >
            {copied ? 'Copied' : 'Copy sanitized report'}
          </button>
          <Link href="/gym" className="min-h-11 px-3 rounded-xl border border-zinc-200 text-sm inline-flex items-center">
            Open Gym AI
          </Link>
        </div>
      </header>

      {!result ? (
        <p className="text-sm text-zinc-500">No intelligence run yet. Ask Gym AI or run the sample.</p>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
            <h2 className="text-sm font-semibold">Request metadata</h2>
            <p className="text-xs text-zinc-500 font-mono">
              {result.trace.requestId} · {result.trace.specialistId} · {Math.round(result.confidence * 100)}% · {result.trace.durationMs}ms
            </p>
            <p className="text-sm">{result.trace.question}</p>
            <p className="text-xs text-zinc-500">
              Sources: {result.trace.sourceSystemsUsed.join(', ') || 'none'} · Records: {result.trace.recordsRetrieved}
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">Pipeline stages</h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {result.trace.stages.map(stage => (
                <li
                  key={`${stage.id}-${stage.durationMs}-${stage.status}`}
                  className={`rounded-xl border px-3 py-2 text-sm flex items-start gap-2 ${statusClass(stage.status)}`}
                >
                  <span className="font-mono text-xs mt-0.5">{statusGlyph(stage.status)}</span>
                  <div className="min-w-0">
                    <p className="font-medium">{stage.label}</p>
                    <p className="text-xs opacity-80 truncate">
                      {stage.sourceSystem ? `${stage.sourceSystem} · ` : ''}{stage.detail ?? stage.status}
                      {typeof stage.recordsRetrieved === 'number' ? ` · n=${stage.recordsRetrieved}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
              <h2 className="text-sm font-semibold">Declared profile</h2>
              <ul className="text-sm space-y-1">
                {(ctx?.declaredProfile.length ? ctx.declaredProfile : []).map(d => (
                  <li key={d.key}><span className="text-zinc-500">{d.label}:</span> {d.value}</li>
                ))}
                {!ctx?.declaredProfile.length && <li className="text-zinc-500">None</li>}
              </ul>
              <h2 className="text-sm font-semibold pt-3">Observed identity</h2>
              <ul className="text-sm space-y-1">
                {(ctx?.observedIdentity.length ? ctx.observedIdentity : []).map(o => (
                  <li key={o.key}>{o.label}: {o.value} ({Math.round(o.confidence * 100)}%)</li>
                ))}
                {!ctx?.observedIdentity.length && <li className="text-zinc-500">None</li>}
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
              <h2 className="text-sm font-semibold">Reality / readiness</h2>
              <p className="text-sm">{ctx?.realitySnapshot.summary}</p>
              <p className="text-xs text-zinc-500">Readiness: {ctx?.readiness ?? 'n/a'}</p>
              <p className="text-xs text-zinc-500">Recovery freshness: {ctx?.dataFreshness.recovery ?? 'unknown'}</p>
              <h2 className="text-sm font-semibold pt-3">Missing information</h2>
              <p className="text-sm">{result.missingInformation.join(', ') || 'None'}</p>
              <h2 className="text-sm font-semibold pt-3">Warnings</h2>
              <p className="text-sm">{result.warnings.join(' · ') || 'None'}</p>
            </div>
          </section>

          <section className="grid lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-semibold mb-2">Memories</h2>
              <ul className="space-y-2 text-sm">
                {result.relevantMemories.length === 0 && <li className="text-zinc-500">None</li>}
                {result.relevantMemories.map(m => (
                  <li key={m.id}><span className="font-medium">{m.title}</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-semibold mb-2">Beliefs</h2>
              <ul className="space-y-2 text-sm">
                {result.relevantBeliefs.length === 0 && <li className="text-zinc-500">None</li>}
                {result.relevantBeliefs.map(b => (
                  <li key={b.id}>{b.statement}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-semibold mb-2">Domain evidence</h2>
              <ul className="space-y-2 text-sm">
                {(ctx?.domainEvidence.length ? ctx.domainEvidence : result.evidence).slice(0, 8).map(e => (
                  <li key={e.id}>
                    <span className="font-medium">{e.title}</span>
                    <span className="block text-xs text-zinc-500">{e.freshness ?? 'unknown'} · {e.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
            <h2 className="text-sm font-semibold">Final structured context / response</h2>
            <p className="text-xs text-zinc-500">{result.explanation}</p>
            <pre className="text-sm whitespace-pre-wrap font-sans bg-zinc-50 rounded-xl p-3 border border-zinc-100 max-h-80 overflow-auto">
              {result.response || '(empty)'}
            </pre>
          </section>
        </>
      )}
    </div>
  )
}
