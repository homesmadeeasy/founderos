'use client'

import Link from 'next/link'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { getSuccessRateForDecision } from '@/lib/outcome-engine/outcomeEngine'
import { getDecisionInfluenceLabel } from '@/lib/domain-intelligence/domainSummaries'
import Card from './Card'

export default function TodayDecision() {
  const { ready, decisionOutput, domainIntelligence, todayPrediction } = useMorningExecution()

  if (!ready || !decisionOutput) {
    return (
      <Card className="p-4 sm:p-5 text-center" delay={480}>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400 mb-2">Recommendation</p>
        <p className="text-xs text-zinc-500">Preparing recommendation…</p>
      </Card>
    )
  }

  const { primaryDecision, confidence, confidenceLabel, explanation, tradeoffs, evidence } = decisionOutput
  const history = getSuccessRateForDecision(primaryDecision.title, primaryDecision.area)
  const influence = domainIntelligence ? getDecisionInfluenceLabel(domainIntelligence.coordinator) : ''

  return (
    <Card className="p-4 sm:p-5" delay={480}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-indigo-500/80 mb-2">Today&apos;s decision</p>
      <h3 className="text-base sm:text-lg font-semibold text-zinc-900 tracking-tight leading-snug">
        {primaryDecision.action}
      </h3>
      <p className="text-xs text-zinc-600 mt-2 leading-relaxed line-clamp-2">{primaryDecision.reason}</p>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
          confidenceLabel === 'high'
            ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200/60'
            : confidenceLabel === 'medium'
              ? 'bg-amber-50/80 text-amber-800 border-amber-200/60'
              : 'bg-zinc-50/80 text-zinc-600 border-zinc-200/60'
        }`}>
          {confidenceLabel} · {confidence}%
        </span>
        {history.total > 0 && (
          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-violet-50/80 text-violet-800 border border-violet-100/80">
            {history.wins}/{history.total} success
          </span>
        )}
      </div>

      {influence && (
        <p className="text-[11px] text-indigo-700/75 mt-2 italic line-clamp-1">{influence}</p>
      )}

      <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed line-clamp-2">{explanation}</p>

      {evidence.filter(e => e.supports).length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-zinc-500">
          {evidence.filter(e => e.supports).slice(0, 2).map(e => (
            <li key={`${e.sourceType}-${e.sourceId}`} className="truncate">· {e.title}</li>
          ))}
        </ul>
      )}

      {tradeoffs.length > 0 && (
        <p className="text-[10px] text-amber-800/90 mt-2 bg-amber-50/60 rounded-lg px-3 py-2 border border-amber-100/60 line-clamp-2">
          {tradeoffs[0].recommendation}
        </p>
      )}

      {todayPrediction && (
        <p className="text-[10px] text-violet-700/80 mt-2">Tracked tonight in Evening Review.</p>
      )}

      <Link
        href="/morning"
        className="inline-flex mt-4 px-5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-md shadow-zinc-900/10"
      >
        Begin
      </Link>
    </Card>
  )
}
