'use client'

import { useState } from 'react'
import {
  Sun, RefreshCw, Target, AlertTriangle, BookOpen, History, Brain, Ban, Scale,
} from 'lucide-react'
import UniversalCaptureInput from '@/components/capture/UniversalCaptureInput'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { KNOWLEDGE_TYPE_LABEL } from '@/lib/knowledge-engine/knowledgeTypes'
import { MEMORY_TYPE_LABEL } from '@/lib/memory-engine/memoryTypes'

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10'

export default function MorningPage() {
  const {
    ready,
    dailyContext,
    reasoningOutput,
    morningPlan,
    decisionOutput,
    regenerateMorningPlan,
    updatePrimaryMission,
    markPlanCompleted,
    updatePlanItem,
  } = useMorningExecution()

  const [missionEdit, setMissionEdit] = useState('')

  if (!ready || !morningPlan || !dailyContext || !reasoningOutput) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-zinc-400">Compiling morning execution slice…</p>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Vertical Slice</p>
            <h1 className="text-2xl font-bold text-zinc-900 mt-0.5 flex items-center gap-2">
              <Sun size={24} className="text-amber-500" />
              Morning Execution
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Context → Reasoning → Plan — {morningPlan.date}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => regenerateMorningPlan(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <RefreshCw size={16} />
              Regenerate
            </button>
            {!morningPlan.completed && (
              <button
                type="button"
                onClick={markPlanCompleted}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800"
              >
                Mark day complete
              </button>
            )}
          </div>
        </header>

        <section className="rounded-2xl border border-amber-200 bg-white p-4">
          <UniversalCaptureInput variant="compact" placeholder="Capture before you execute…" />
        </section>

        {/* Morning Plan */}
        <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-900 uppercase tracking-wider mb-3">
            Morning Plan
          </h2>
          <h3 className="text-lg font-bold text-zinc-900">{morningPlan.title}</h3>
          <p className="text-sm text-zinc-600 mt-2">{morningPlan.summary}</p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              className={inputClass}
              placeholder="Edit primary mission…"
              value={missionEdit || morningPlan.primaryMission}
              onChange={e => setMissionEdit(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                updatePrimaryMission(missionEdit || morningPlan.primaryMission)
                setMissionEdit('')
              }}
              className="shrink-0 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-semibold"
            >
              Save mission
            </button>
          </div>

          {morningPlan.scheduleBlocks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {morningPlan.scheduleBlocks.map(block => (
                <span
                  key={block.id}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-amber-200 text-amber-900"
                >
                  {block.type} · {block.label} ({block.durationMinutes}m)
                </span>
              ))}
            </div>
          )}
        </section>

        {decisionOutput && (
          <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Scale size={16} /> Today&apos;s Decision
            </h2>
            <h3 className="text-lg font-bold text-zinc-900">{decisionOutput.primaryDecision.action}</h3>
            <p className="text-sm text-zinc-600 mt-2">{decisionOutput.primaryDecision.reason}</p>

            <div className="mt-3 flex items-center gap-2">
              <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full border ${
                decisionOutput.confidenceLabel === 'high'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : decisionOutput.confidenceLabel === 'medium'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-zinc-50 text-zinc-500 border-zinc-200'
              }`}>
                {decisionOutput.confidenceLabel} confidence · {decisionOutput.confidence}%
              </span>
            </div>

            <p className="text-sm text-zinc-700 mt-4 leading-relaxed">{decisionOutput.explanation}</p>

            {decisionOutput.evidence.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Evidence summary
                </p>
                <ul className="text-sm text-zinc-600 space-y-1">
                  {decisionOutput.evidence.filter(e => e.supports).slice(0, 5).map(e => (
                    <li key={`${e.sourceType}-${e.sourceId}`}>
                      • [{e.sourceType}] {e.title} — {e.summary.slice(0, 100)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {decisionOutput.ignoreToday.length > 0 && (
              <div className="mt-4 rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Ban size={12} /> Ignore today
                </p>
                <ul className="text-sm text-zinc-600 space-y-1">
                  {decisionOutput.ignoreToday.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {decisionOutput.tradeoffs.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
                  Tradeoffs
                </p>
                <ul className="text-xs text-amber-800 space-y-2">
                  {decisionOutput.tradeoffs.map((t, i) => (
                    <li key={i}>
                      <strong>{t.optionA}</strong> vs <strong>{t.optionB}</strong> → {t.recommendation}. {t.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Context Summary */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain size={16} /> Daily Context
            </h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-zinc-400 text-xs">Score</dt><dd className="font-semibold">{dailyContext.contextScore}/100</dd></div>
              <div><dt className="text-zinc-400 text-xs">Projects</dt><dd className="font-semibold">{dailyContext.activeProjects.length}</dd></div>
              <div><dt className="text-zinc-400 text-xs">Open tasks</dt><dd className="font-semibold">{dailyContext.openTasks.length}</dd></div>
              <div><dt className="text-zinc-400 text-xs">Blockers</dt><dd className="font-semibold">{dailyContext.blockers.length}</dd></div>
            </dl>
            {dailyContext.healthSignals && (
              <p className="text-xs text-zinc-500 mt-3">
                Health: {dailyContext.healthSignals.score}/100 — {dailyContext.healthSignals.summary}
              </p>
            )}
          </section>

          {/* Reasoning */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
              Reasoning Output
            </h2>
            <p className="text-sm font-medium text-zinc-900">Focus: {reasoningOutput.primaryFocus}</p>
            <p className="text-sm text-zinc-600 mt-2">{reasoningOutput.rationale}</p>
            {reasoningOutput.secondaryFocuses.length > 0 && (
              <p className="text-xs text-zinc-500 mt-2">
                Also: {reasoningOutput.secondaryFocuses.join(', ')}
              </p>
            )}
          </section>
        </div>

        {/* Priorities */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target size={16} /> Top Priorities
          </h2>
          <div className="space-y-3">
            {morningPlan.topPriorities.map((item, i) => (
              <div key={item.id} className="flex items-start gap-3 border border-zinc-100 rounded-xl p-4">
                <button
                  type="button"
                  onClick={() => updatePlanItem(item.id, { completed: !item.completed })}
                  className={`mt-0.5 w-5 h-5 rounded border shrink-0 ${
                    item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300'
                  }`}
                />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${item.completed ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                    {i + 1}. {item.title}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">{item.reason}</p>
                  {item.estimatedMinutes && (
                    <p className="text-xs text-zinc-400 mt-1">~{item.estimatedMinutes} min</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blockers / Risks */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              Blockers / Risks
            </h2>
            <ul className="space-y-2 text-sm">
              {[...reasoningOutput.blockers, ...reasoningOutput.risks].map((item, i) => (
                <li key={i} className="text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{item}</li>
              ))}
              {[...reasoningOutput.blockers, ...reasoningOutput.risks].length === 0 && (
                <li className="text-zinc-500">No major risks detected.</li>
              )}
            </ul>
          </section>

          {/* Defer */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
              Defer List
            </h2>
            <ul className="text-sm text-zinc-600 space-y-1">
              {morningPlan.deferList.map((d, i) => (
                <li key={i}>• {d}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Knowledge */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen size={16} /> Relevant Knowledge
            </h2>
            {dailyContext.relevantKnowledge.length === 0 ? (
              <p className="text-sm text-zinc-500">No knowledge matched today.</p>
            ) : (
              <ul className="space-y-2">
                {dailyContext.relevantKnowledge.map(k => (
                  <li key={k.id} className="text-sm">
                    <span className="font-medium text-zinc-900">{k.title}</span>
                    <span className="text-zinc-400 text-xs ml-2">{KNOWLEDGE_TYPE_LABEL[k.type]}</span>
                    <p className="text-xs text-zinc-500 mt-0.5">{k.principle}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Memories */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <History size={16} /> Recent Memories
            </h2>
            {dailyContext.recentMemories.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent memories.</p>
            ) : (
              <ul className="space-y-2">
                {dailyContext.recentMemories.slice(0, 6).map(m => (
                  <li key={m.id} className="text-sm text-zinc-700">
                    <span className="text-zinc-400 text-xs">{MEMORY_TYPE_LABEL[m.type]} · </span>
                    {m.title}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
