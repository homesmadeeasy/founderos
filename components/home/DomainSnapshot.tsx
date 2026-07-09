'use client'

import Link from 'next/link'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { statusColorClass } from '@/lib/domain-intelligence/domainSummaries'
import { domainOneLiner, HOME_DOMAIN_IDS } from '@/lib/home/homeUtils'
import Card from './Card'

const DOMAIN_GRADIENTS: Record<string, string> = {
  founder: 'from-violet-500/12 to-indigo-500/5',
  school: 'from-amber-500/12 to-orange-500/5',
  health: 'from-emerald-500/12 to-teal-500/5',
  finance: 'from-blue-500/12 to-sky-500/5',
  relationships: 'from-rose-500/12 to-pink-500/5',
  systems: 'from-zinc-500/10 to-slate-500/5',
}

export default function DomainSnapshot() {
  const { domainIntelligence } = useMorningExecution()

  if (!domainIntelligence) {
    return (
      <Card className="p-4 sm:p-5" delay={320}>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-2">Domains</p>
        <p className="text-xs text-zinc-500">Domain evaluations loading…</p>
      </Card>
    )
  }

  const evaluations = HOME_DOMAIN_IDS
    .map(id => domainIntelligence.evaluations.find(e => e.domainId === id))
    .filter(Boolean)

  return (
    <Card className="p-4 sm:p-5" delay={320}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400">Domains</p>
        <Link href="/domains" className="text-[10px] text-indigo-600/70 hover:text-indigo-700 transition-colors">Details</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {evaluations.map(e => e && (
          e.domainId === 'founder' ? (
            <Link
              key={e.id}
              href="/founder"
              className={`rounded-xl border border-violet-200/60 bg-gradient-to-br ${DOMAIN_GRADIENTS.founder} p-2.5 shadow-[0_1px_6px_rgba(99,102,241,0.08)] hover:shadow-[0_2px_12px_rgba(99,102,241,0.12)] transition-shadow block`}
            >
              <p className="text-[11px] font-semibold text-violet-800 truncate">Founder AI</p>
              <p className="text-2xl font-semibold text-zinc-900 mt-1 tabular-nums leading-none">{e.score}</p>
              <span className={`inline-block mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${statusColorClass(e.status)}`}>
                {e.status.replace('_', ' ')}
              </span>
              <p className="text-[10px] text-zinc-500 mt-1.5 line-clamp-2 leading-snug">
                {domainOneLiner(e)}
              </p>
            </Link>
          ) : (
            <div
              key={e.id}
              className={`rounded-xl border border-white/80 bg-gradient-to-br ${DOMAIN_GRADIENTS[e.domainId] ?? 'from-white/60 to-white/40'} p-2.5 shadow-[0_1px_6px_rgba(99,102,241,0.04)]`}
            >
              <p className="text-[11px] font-semibold text-zinc-800 truncate">{e.domainName}</p>
              <p className="text-2xl font-semibold text-zinc-900 mt-1 tabular-nums leading-none">{e.score}</p>
              <span className={`inline-block mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${statusColorClass(e.status)}`}>
                {e.status.replace('_', ' ')}
              </span>
              <p className="text-[10px] text-zinc-500 mt-1.5 line-clamp-2 leading-snug">
                {domainOneLiner(e)}
              </p>
            </div>
          )
        ))}
      </div>
    </Card>
  )
}
