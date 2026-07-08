'use client'

import { useState } from 'react'
import { Crown, RefreshCw, AlertTriangle, Target, BarChart3, Lightbulb, Scale } from 'lucide-react'
import { useExecutiveEngine } from '@/contexts/ExecutiveEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { LIFE_AREA_LABEL } from '@/lib/object-engine/objectTypes'
import type { LifeArea } from '@/lib/object-engine/objectTypes'

const DECISION_PROMPTS = [
  'What should I focus on today?',
  'What should I ignore?',
  'What is blocking me?',
  'Which project needs attention?',
  'Why is FounderOS important today?',
] as const

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10'

function priorityBadge(priority: string) {
  const colors: Record<string, string> = {
    high: 'bg-red-50 text-red-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-zinc-100 text-zinc-600',
  }
  return colors[priority] ?? colors.medium
}

function confidenceBadge(confidence: string) {
  const colors: Record<string, string> = {
    high: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-blue-50 text-blue-700',
    low: 'bg-zinc-100 text-zinc-600',
  }
  return colors[confidence] ?? colors.medium
}

export default function ExecutivePage() {
  const {
    ready,
    dailyBriefing,
    attentionScores,
    recommendations,
    warnings,
    tradeoffs,
    recentDecisions,
    regenerateBriefing,
    makeDecision,
    getTopFocus,
  } = useExecutiveEngine()
  const { objects } = useObjectEngine()

  const [customQuestion, setCustomQuestion] = useState('')
  const [lastDecision, setLastDecision] = useState<ReturnType<typeof makeDecision> | null>(null)

  const topFocus = getTopFocus()

  function handleDecision(question: string) {
    const decision = makeDecision(question)
    setLastDecision(decision)
    setCustomQuestion('')
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-zinc-400">Loading executive engine…</p>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sprint 5</p>
            <h1 className="text-2xl font-bold text-zinc-900 mt-0.5 flex items-center gap-2">
              <Crown size={24} className="text-amber-600" />
              Executive Engine
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              What matters next — priorities, attention, and decisions
            </p>
          </div>
          <button
            type="button"
            onClick={regenerateBriefing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw size={16} />
            Regenerate briefing
          </button>
        </header>

        {/* Daily Briefing */}
        {dailyBriefing && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
              Daily Executive Briefing
            </h2>
            <h3 className="text-lg font-bold text-zinc-900">{dailyBriefing.title}</h3>
            <p className="text-sm text-zinc-600 mt-2">{dailyBriefing.summary}</p>

            {dailyBriefing.priorities.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-zinc-400 uppercase mb-2">Priorities</p>
                <ul className="space-y-1">
                  {dailyBriefing.priorities.map((p, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex items-start gap-2">
                      <Target size={14} className="text-amber-600 mt-0.5 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dailyBriefing.opportunities.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-zinc-400 uppercase mb-2">Opportunities</p>
                <ul className="space-y-1">
                  {dailyBriefing.opportunities.map((o, i) => (
                    <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                      <Lightbulb size={14} className="mt-0.5 shrink-0" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Focus */}
          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <h2 className="text-sm font-semibold text-amber-900 uppercase tracking-wider mb-3">
              Top Focus
            </h2>
            <p className="text-lg font-bold text-zinc-900">{topFocus.title}</p>
            <p className="text-sm text-zinc-600 mt-1">{topFocus.summary}</p>
            {topFocus.score != null && (
              <p className="text-xs text-amber-700 mt-2 font-medium">
                Attention score: {topFocus.score}/100
              </p>
            )}
          </section>

          {/* Warnings */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              Warnings / Conflicts
            </h2>
            {warnings.length === 0 ? (
              <p className="text-sm text-zinc-500">No conflicts detected today.</p>
            ) : (
              <ul className="space-y-2">
                {warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                    {w}
                  </li>
                ))}
              </ul>
            )}
            {tradeoffs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-100">
                <p className="text-xs font-medium text-zinc-400 uppercase mb-2">Tradeoffs</p>
                <ul className="space-y-1">
                  {tradeoffs.map((t, i) => (
                    <li key={i} className="text-sm text-zinc-600">{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Attention Scores */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 size={16} />
            Attention Scores
          </h2>
          {attentionScores.length === 0 ? (
            <p className="text-sm text-zinc-500">No scorable objects yet.</p>
          ) : (
            <div className="space-y-3">
              {attentionScores.slice(0, 8).map(score => {
                const obj = objects.find(o => o.id === score.objectId)
                if (!obj) return null
                return (
                  <div key={score.objectId} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{obj.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{score.explanation}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${score.totalScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-zinc-700 w-8 text-right">
                        {score.totalScore}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Recommendations */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">
            Recommendations
          </h2>
          <div className="space-y-4">
            {recommendations.map(rec => (
              <div key={rec.id} className="border border-zinc-100 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-zinc-900">{rec.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge(rec.priority)}`}>
                    {rec.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceBadge(rec.confidence)}`}>
                    {rec.confidence}
                  </span>
                  {rec.area && (
                    <span className="text-xs text-zinc-500">
                      {LIFE_AREA_LABEL[rec.area as LifeArea]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-600">{rec.summary}</p>
                <p className="text-xs text-zinc-500 mt-2 italic">Rationale: {rec.rationale}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Decision Console */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Scale size={16} />
            Decision Console
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {DECISION_PROMPTS.map(q => (
              <button
                key={q}
                type="button"
                onClick={() => handleDecision(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (customQuestion.trim()) handleDecision(customQuestion.trim())
            }}
            className="flex gap-2"
          >
            <input
              className={inputClass}
              placeholder="Ask an executive question…"
              value={customQuestion}
              onChange={e => setCustomQuestion(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 shrink-0"
            >
              Decide
            </button>
          </form>

          {lastDecision && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <p className="text-xs text-zinc-400 uppercase mb-1">Q: {lastDecision.question}</p>
              <p className="text-sm font-medium text-zinc-900">{lastDecision.answer}</p>
              <p className="text-xs text-zinc-500 mt-2">{lastDecision.rationale}</p>
              {lastDecision.tradeoffs.length > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  Tradeoffs: {lastDecision.tradeoffs.join(' ')}
                </p>
              )}
            </div>
          )}

          {recentDecisions.length > 1 && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <p className="text-xs font-medium text-zinc-400 uppercase mb-2">Recent decisions</p>
              <ul className="space-y-2">
                {recentDecisions.slice(0, 5).map(d => (
                  <li key={d.id} className="text-xs text-zinc-600">
                    <span className="font-medium">{d.question}</span> → {d.answer.slice(0, 80)}
                    {d.answer.length > 80 ? '…' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
