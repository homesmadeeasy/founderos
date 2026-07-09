'use client'

import { Layers } from 'lucide-react'
import Link from 'next/link'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { statusColorClass } from '@/lib/domain-intelligence/domainSummaries'

export default function DomainsPage() {
  const { ready, domainIntelligence } = useMorningExecution()

  if (!ready || !domainIntelligence) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-zinc-400">Loading domain evaluations…</p>
      </div>
    )
  }

  const { evaluations, coordinator } = domainIntelligence

  return (
    <div className="min-h-full bg-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Debug</p>
          <h1 className="text-2xl font-bold text-zinc-900 mt-0.5 flex items-center gap-2">
            <Layers size={24} className="text-violet-600" />
            Domain Intelligence
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Evaluations computed from existing FounderOS state — no separate storage.
          </p>
        </header>

        <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-violet-900 uppercase tracking-wider">Global Coordinator</h2>
          <p className="text-sm text-violet-900"><strong>Top domain:</strong> {coordinator.topDomainName}</p>
          <p className="text-sm text-violet-800">{coordinator.globalRecommendation}</p>
          <p className="text-xs text-violet-700">{coordinator.explanation}</p>
          {coordinator.tradeoffs.length > 0 && (
            <ul className="text-xs text-amber-800 space-y-1">
              {coordinator.tradeoffs.map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {evaluations.map(e => (
            <section key={e.id} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-zinc-900">{e.domainName}</h3>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${statusColorClass(e.status)}`}>
                  {e.status.replace('_', ' ')} · {e.score}
                </span>
              </div>
              <p className="text-sm text-zinc-700">{e.recommendation}</p>
              <p className="text-xs text-zinc-500"><strong>Next:</strong> {e.nextAction}</p>
              <p className="text-xs text-zinc-400">Priority: {e.priority} · Confidence: {e.confidence}%</p>
              {e.risks.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-red-600 uppercase">Risks</p>
                  <ul className="text-xs text-red-800">{e.risks.map((r, i) => <li key={i}>• {r}</li>)}</ul>
                </div>
              )}
              {e.opportunities.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase">Opportunities</p>
                  <ul className="text-xs text-emerald-800">{e.opportunities.map((o, i) => <li key={i}>• {o}</li>)}</ul>
                </div>
              )}
              {e.evidence.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase">Evidence</p>
                  <ul className="text-xs text-zinc-600 space-y-1">
                    {e.evidence.map(ev => (
                      <li key={`${ev.sourceType}-${ev.sourceId}`}>
                        [{ev.sourceType}] {ev.title} (w{ev.weight}) {ev.supports ? '✓' : ev.conflicts ? '✗' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>

        <p className="text-xs text-zinc-400">
          <Link href="/morning" className="text-violet-700 hover:underline">Back to Morning</Link>
          {' · '}
          <Link href="/dashboard" className="text-violet-700 hover:underline">Dashboard</Link>
        </p>
      </div>
    </div>
  )
}
