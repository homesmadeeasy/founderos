'use client'

import Link from 'next/link'
import { ShieldCheck, ChevronRight, FlaskConical } from 'lucide-react'
import { loadLatestEvaluationSummary } from '@/lib/evaluation/founder-ai/evaluationStorage'

export default function FounderReliabilitySection() {
  const latest = loadLatestEvaluationSummary()

  return (
    <section className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
            <ShieldCheck size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Reliability</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Founder AI evaluation summary</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {latest ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-zinc-100 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Last run</p>
              <p className="text-zinc-700 mt-1 text-xs">{new Date(latest.runAt).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-zinc-100 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Overall score</p>
              <p className="text-zinc-700 mt-1 font-semibold">{latest.overallScore}/100</p>
            </div>
            <div className="rounded-lg border border-zinc-100 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Critical failures</p>
              <p className={`mt-1 font-semibold ${latest.criticalFailures > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {latest.criticalFailures}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No evaluation runs yet. Open the Evaluation Lab to measure Founder AI reliability.</p>
        )}

        <Link
          href="/evaluation"
          className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700"
        >
          <FlaskConical size={14} />
          Open Evaluation Lab
          <ChevronRight size={14} />
        </Link>
      </div>
    </section>
  )
}
