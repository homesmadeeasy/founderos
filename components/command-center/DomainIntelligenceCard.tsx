'use client'

import { Layers, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { statusColorClass } from '@/lib/domain-intelligence/domainSummaries'
import CardShell from './CardShell'

export default function DomainIntelligenceCard() {
  const { ready, domainIntelligence } = useMorningExecution()

  if (!ready || !domainIntelligence) {
    return (
      <CardShell title="Domain Intelligence" icon={Layers}>
        <p className="text-sm text-zinc-400">Evaluating life domains…</p>
      </CardShell>
    )
  }

  const { coordinator } = domainIntelligence
  const atRisk = coordinator.evaluations.filter(e => e.status === 'at_risk' || e.priority === 'critical')

  return (
    <CardShell
      title="Domain Intelligence"
      icon={Layers}
      action={<Link href="/domains" className="text-xs font-semibold text-violet-700 hover:underline">Details</Link>}
    >
      <div className="space-y-3">
        <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
          <p className="text-[11px] font-semibold text-violet-500 uppercase tracking-wider">Top domain today</p>
          <p className="text-sm font-bold text-violet-900 mt-1">{coordinator.topDomainName}</p>
          <p className="text-xs text-violet-800 mt-1">{coordinator.globalRecommendation}</p>
        </div>

        {atRisk.length > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={12} /> At risk / critical
            </p>
            <ul className="text-xs text-red-800 mt-1 space-y-1">
              {atRisk.slice(0, 3).map(e => (
                <li key={e.id}>• {e.domainName} — {e.recommendation}</li>
              ))}
            </ul>
          </div>
        )}

        {coordinator.neglectedDomains.length > 0 && (
          <p className="text-xs text-zinc-500">
            Neglected: {coordinator.neglectedDomains.map(id =>
              domainIntelligence.evaluations.find(e => e.domainId === id)?.domainName ?? id,
            ).join(', ')}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {coordinator.evaluations.map(e => (
            <span
              key={e.id}
              className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${statusColorClass(e.status)}`}
            >
              {e.domainName}: {e.score}
            </span>
          ))}
        </div>

        <Link
          href="/morning"
          className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline"
        >
          Domain snapshot on Morning <ArrowRight size={12} />
        </Link>
      </div>
    </CardShell>
  )
}
