'use client'

import { RefreshCw, Sun, AlertTriangle, Target, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import CardShell from './CardShell'

export default function MorningExecutionBriefingCard() {
  const {
    ready,
    morningPlan,
    reasoningOutput,
    regenerateMorningPlan,
    updatePlanItem,
    getFirstAction,
  } = useMorningExecution()

  if (!ready || !morningPlan) {
    return (
      <CardShell title="Morning Execution Briefing" icon={Sun}>
        <p className="text-sm text-zinc-500">Compiling your morning plan…</p>
      </CardShell>
    )
  }

  const firstAction = getFirstAction()

  return (
    <CardShell
      title="Morning Execution Briefing"
      icon={Sun}
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => regenerateMorningPlan(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800"
          >
            <RefreshCw size={13} />
            Regenerate
          </button>
          <Link
            href="/morning"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Full view
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Primary mission
          </p>
          <p className="text-sm font-semibold text-zinc-900">{morningPlan.primaryMission}</p>
        </div>

        <p className="text-sm text-zinc-600 leading-relaxed">{morningPlan.summary}</p>

        {morningPlan.topPriorities.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Target size={12} /> Top priorities
            </p>
            <ul className="space-y-2">
              {morningPlan.topPriorities.map((item, i) => (
                <li key={item.id} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => updatePlanItem(item.id, { completed: !item.completed })}
                    className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] ${
                      item.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-zinc-300 hover:border-zinc-400'
                    }`}
                    aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {item.completed ? '✓' : ''}
                  </button>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${item.completed ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                      {i + 1}. {item.title}
                    </p>
                    <p className="text-xs text-zinc-500">{item.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {firstAction && !firstAction.completed && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider mb-1">
              Recommended first action
            </p>
            <p className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
              <ArrowRight size={14} className="text-indigo-600" />
              {firstAction.title}
            </p>
            <p className="text-xs text-zinc-600 mt-1">{firstAction.reason}</p>
          </div>
        )}

        {morningPlan.warnings.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertTriangle size={12} /> Warnings
            </p>
            <ul className="text-xs text-amber-800 space-y-1">
              {morningPlan.warnings.slice(0, 2).map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {morningPlan.deferList.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Defer for today
            </p>
            <p className="text-xs text-zinc-500">
              {morningPlan.deferList.slice(0, 3).join(' · ')}
            </p>
          </div>
        )}

        {reasoningOutput?.rationale && (
          <p className="text-xs text-zinc-400 italic border-t border-zinc-100 pt-3">
            Why: {reasoningOutput.rationale}
          </p>
        )}
      </div>
    </CardShell>
  )
}
