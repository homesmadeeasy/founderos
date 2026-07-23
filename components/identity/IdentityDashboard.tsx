'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useIdentity } from '@/contexts/IdentityContext'
import { formatConfidencePercent } from '@/lib/identity/identityConfidence'
import { IDENTITY_CATEGORY_LABELS, type IdentityFact } from '@/lib/identity/identityTypes'
import IdentityOnboarding from './IdentityOnboarding'

function FactCard({
  fact,
  evidenceSummaries,
  onConfirm,
  onReject,
  onDismiss,
}: {
  fact: IdentityFact
  evidenceSummaries: string[]
  onConfirm: () => void
  onReject: () => void
  onDismiss: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <article className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            {IDENTITY_CATEGORY_LABELS[fact.category]} · {fact.kind}
          </p>
          <h3 className="text-sm font-semibold text-zinc-900 mt-0.5">{fact.label}</h3>
          <p className="text-sm text-zinc-700 mt-1">{fact.displayValue}</p>
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
          {formatConfidencePercent(fact.confidence)}
        </span>
      </div>
      {fact.contradictionNote && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          {fact.contradictionNote}
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs text-emerald-700 underline min-h-11"
        aria-expanded={open}
      >
        {open ? 'Hide why' : 'Why?'}
      </button>
      {open && (
        <div className="rounded-xl bg-zinc-50 px-3 py-3 space-y-2 text-xs text-zinc-600">
          <p><span className="font-medium text-zinc-800">Source:</span> {fact.source.label} ({fact.source.kind})</p>
          <p><span className="font-medium text-zinc-800">Confidence:</span> {formatConfidencePercent(fact.confidence)}</p>
          {evidenceSummaries.length === 0 ? (
            <p>No linked evidence summaries.</p>
          ) : (
            <ul className="space-y-1 list-disc pl-4">
              {evidenceSummaries.map(s => <li key={s}>{s}</li>)}
            </ul>
          )}
          {fact.kind === 'observed' && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={onConfirm} className="px-3 py-2 rounded-lg bg-zinc-900 text-white min-h-11">Confirm</button>
              <button type="button" onClick={onReject} className="px-3 py-2 rounded-lg border border-zinc-200 min-h-11">Reject</button>
              <button type="button" onClick={onDismiss} className="px-3 py-2 rounded-lg border border-zinc-200 text-zinc-500 min-h-11">Dismiss</button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default function IdentityDashboard() {
  const {
    ready,
    store,
    view,
    reviewFact,
    recentHistory,
  } = useIdentity()
  const [section, setSection] = useState<'overview' | 'declared' | 'observed' | 'history'>('overview')

  const evidenceByFact = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const e of store.evidence) {
      if (!e.factId) continue
      const list = map.get(e.factId) ?? []
      list.push(e.summary)
      map.set(e.factId, list)
    }
    for (const fact of store.facts) {
      const fromIds = store.evidence
        .filter(e => fact.evidenceIds.includes(e.id))
        .map(e => e.summary)
      if (fromIds.length) {
        map.set(fact.id, [...new Set([...(map.get(fact.id) ?? []), ...fromIds])])
      }
    }
    return map
  }, [store.evidence, store.facts])

  if (!ready) {
    return <p className="text-sm text-zinc-500 p-6">Loading identity…</p>
  }

  if (!store.onboardingComplete) {
    return <IdentityOnboarding />
  }

  const strengths = view.observed.filter(f =>
    f.key.includes('consistent') || f.category === 'capabilities' || f.confidence >= 0.85,
  ).slice(0, 4)
  const growth = view.contradictions.concat(
    view.observed.filter(f => f.key.startsWith('avoids_') || f.confidence < 0.7),
  ).slice(0, 4)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 overflow-x-hidden">
      <header className="space-y-2">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-700">Identity Engine</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          Who FounderOS thinks you are
        </h1>
        <p className="text-sm text-zinc-600 max-w-2xl">
          Declared facts stay yours. Observations are inferred with confidence and evidence — specialists read this shared layer so you do not repeat yourself.
        </p>
        <Link href="/settings" className="text-xs text-emerald-700 hover:underline">Manage specialists in settings →</Link>
      </header>

      <div className="flex flex-wrap gap-2">
        {([
          ['overview', 'Overview'],
          ['declared', 'Declared'],
          ['observed', 'Observed'],
          ['history', 'Recent changes'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`text-xs px-3 py-2 rounded-xl border min-h-11 ${
              section === id ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-zinc-200 text-zinc-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">Snapshot</h2>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {view.narrativeHints.length === 0 ? (
                <li className="text-zinc-500">No active facts yet — declare goals or let observations accumulate.</li>
              ) : view.narrativeHints.slice(0, 8).map(h => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
          </section>

          <div className="grid sm:grid-cols-2 gap-4">
            <section className="rounded-2xl border border-zinc-200 bg-white/70 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-zinc-900">Goals</h2>
              {(view.byCategory.goals ?? []).length === 0
                ? <p className="text-xs text-zinc-500">No goals declared yet.</p>
                : (view.byCategory.goals ?? []).map(f => (
                  <p key={f.id} className="text-sm text-zinc-700">{f.displayValue}</p>
                ))}
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white/70 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-zinc-900">Preferences</h2>
              {(view.byCategory.preferences ?? []).length === 0
                ? <p className="text-xs text-zinc-500">No preferences yet.</p>
                : (view.byCategory.preferences ?? []).map(f => (
                  <p key={f.id} className="text-sm text-zinc-700">
                    {f.label}: {f.displayValue}
                    <span className="text-zinc-400"> · {formatConfidencePercent(f.confidence)}</span>
                  </p>
                ))}
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white/70 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-zinc-900">Strengths / habits</h2>
              {strengths.length === 0
                ? <p className="text-xs text-zinc-500">Patterns will appear as evidence grows.</p>
                : strengths.map(f => (
                  <p key={f.id} className="text-sm text-zinc-700">{f.displayValue}</p>
                ))}
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white/70 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-zinc-900">Growth areas</h2>
              {growth.length === 0
                ? <p className="text-xs text-zinc-500">No contradictions or avoid patterns yet.</p>
                : growth.map(f => (
                  <p key={f.id} className="text-sm text-zinc-700">{f.contradictionNote ?? f.displayValue}</p>
                ))}
            </section>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">Observed patterns</h2>
            {view.observed.length === 0 ? (
              <p className="text-xs text-zinc-500">No observations yet. Identity only infers with sufficient evidence.</p>
            ) : view.observed.slice(0, 6).map(fact => (
              <FactCard
                key={fact.id}
                fact={fact}
                evidenceSummaries={evidenceByFact.get(fact.id) ?? []}
                onConfirm={() => void reviewFact({ factId: fact.id, action: 'confirm' })}
                onReject={() => void reviewFact({ factId: fact.id, action: 'reject' })}
                onDismiss={() => void reviewFact({ factId: fact.id, action: 'dismiss' })}
              />
            ))}
          </section>
        </div>
      )}

      {section === 'declared' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">Declared information</h2>
          {view.declared.length === 0 ? (
            <p className="text-xs text-zinc-500">Nothing declared yet.</p>
          ) : view.declared.map(fact => (
            <FactCard
              key={fact.id}
              fact={fact}
              evidenceSummaries={evidenceByFact.get(fact.id) ?? []}
              onConfirm={() => undefined}
              onReject={() => undefined}
              onDismiss={() => undefined}
            />
          ))}
        </section>
      )}

      {section === 'observed' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">Observed patterns</h2>
          {view.observed.map(fact => (
            <FactCard
              key={fact.id}
              fact={fact}
              evidenceSummaries={evidenceByFact.get(fact.id) ?? []}
              onConfirm={() => void reviewFact({ factId: fact.id, action: 'confirm' })}
              onReject={() => void reviewFact({ factId: fact.id, action: 'reject' })}
              onDismiss={() => void reviewFact({ factId: fact.id, action: 'dismiss' })}
            />
          ))}
        </section>
      )}

      {section === 'history' && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900">Recent changes</h2>
          {recentHistory.length === 0 ? (
            <p className="text-xs text-zinc-500">No history yet.</p>
          ) : recentHistory.map(h => (
            <div key={h.id} className="rounded-xl border border-zinc-100 bg-white/80 px-3 py-3 text-xs text-zinc-600">
              <p className="font-medium text-zinc-800">{h.changeType} · {h.actor}</p>
              <p className="tabular-nums text-zinc-400 mt-0.5">{new Date(h.at).toLocaleString()}</p>
              {h.reason && <p className="mt-1">{h.reason}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
