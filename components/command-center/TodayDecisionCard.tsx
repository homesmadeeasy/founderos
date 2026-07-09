'use client'

import { Brain, ArrowRight, Ban } from 'lucide-react'
import Link from 'next/link'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import CardShell from './CardShell'

export default function TodayDecisionCard() {
  const { ready, decisionOutput, morningPlan } = useMorningExecution()

  if (!ready || !decisionOutput) {
    return (
      <CardShell title="Today's Decision" icon={Brain}>
        <p className="text-sm text-zinc-500">Computing today&apos;s decision…</p>
      </CardShell>
    )
  }

  const { primaryDecision, confidence, confidenceLabel, explanation, ignoreToday, evidence } = decisionOutput
  const firstAction = morningPlan?.topPriorities.find(p => !p.completed)

  return (
    <CardShell
      title="Today's Decision"
      icon={Brain}
      action={
        <Link href="/morning" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
          Morning view
        </Link>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Primary decision
          </p>
          <p className="text-sm font-semibold text-zinc-900">{primaryDecision.action}</p>
          <p className="text-xs text-zinc-500 mt-1">{primaryDecision.reason}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full border ${
            confidenceLabel === 'high'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : confidenceLabel === 'medium'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-zinc-50 text-zinc-500 border-zinc-200'
          }`}>
            {confidenceLabel} · {confidence}%
          </span>
          {primaryDecision.estimatedMinutes && (
            <span className="text-[10px] text-zinc-400">~{primaryDecision.estimatedMinutes} min</span>
          )}
        </div>

        {firstAction && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider mb-1">
              First action
            </p>
            <p className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
              <ArrowRight size={14} className="text-indigo-600" />
              {firstAction.title}
            </p>
          </div>
        )}

        <p className="text-sm text-zinc-600 leading-relaxed">{explanation}</p>

        {evidence.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Evidence
            </p>
            <ul className="text-xs text-zinc-600 space-y-1">
              {evidence.filter(e => e.supports).slice(0, 3).map(e => (
                <li key={`${e.sourceType}-${e.sourceId}`}>
                  • [{e.sourceType}] {e.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {ignoreToday.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Ban size={11} /> Ignore today
            </p>
            <ul className="text-xs text-zinc-500 space-y-1">
              {ignoreToday.slice(0, 3).map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CardShell>
  )
}
