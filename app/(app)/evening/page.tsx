'use client'

import { useState } from 'react'
import {
  Moon, Target, Trophy, AlertTriangle, Lightbulb, BookOpen, Brain,
  Sparkles, CheckCircle2, RefreshCw,
} from 'lucide-react'
import { useEveningReview } from '@/contexts/EveningReviewContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import type { EnergyLevel } from '@/lib/evening-review/eveningTypes'

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-900/10'

function ListSection({
  title,
  icon: Icon,
  items,
  placeholder,
  onAdd,
  onRemove,
  accent = 'zinc',
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  items: string[]
  placeholder: string
  onAdd: (value: string) => void
  onRemove: (index: number) => void
  accent?: 'zinc' | 'emerald' | 'amber' | 'violet'
}) {
  const [draft, setDraft] = useState('')
  const accentMap = {
    zinc: 'text-zinc-900',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    violet: 'text-violet-700',
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${accentMap[accent]}`}>
        <Icon size={16} /> {title}
      </h2>
      <div className="flex gap-2 mb-3">
        <input
          className={inputClass}
          placeholder={placeholder}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && draft.trim()) {
              onAdd(draft)
              setDraft('')
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return
            onAdd(draft)
            setDraft('')
          }}
          className="shrink-0 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-semibold"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="flex-1 text-zinc-700">{item}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-xs text-zinc-400 hover:text-red-600"
            >
              Remove
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-zinc-400">Nothing added yet.</li>
        )}
      </ul>
    </section>
  )
}

export default function EveningPage() {
  const { morningPlan } = useMorningExecution()
  const {
    ready,
    eveningReview,
    dailyLearningLoop,
    tomorrowContext,
    updateEveningReview,
    togglePriority,
    addItem,
    removeItem,
    completeEveningReview,
    regenerateLearningLoop,
    saveKnowledgeSuggestion,
    isSuggestionSaved,
  } = useEveningReview()

  if (!ready || !eveningReview) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-zinc-400">Preparing evening review…</p>
      </div>
    )
  }

  const allPriorities = [
    ...eveningReview.completedPriorities,
    ...eveningReview.incompletePriorities.filter(
      p => !eveningReview.completedPriorities.includes(p),
    ),
  ]

  const suggestions = dailyLearningLoop?.knowledgeSuggestions ?? []

  return (
    <div className="min-h-full bg-gradient-to-b from-violet-50/40 to-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-violet-400 uppercase tracking-wider">Daily Loop</p>
            <h1 className="text-2xl font-bold text-zinc-900 mt-0.5 flex items-center gap-2">
              <Moon size={24} className="text-violet-600" />
              Evening Review
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Close the loop — {eveningReview.date}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={regenerateLearningLoop}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <RefreshCw size={16} />
              Refresh loop
            </button>
            {!eveningReview.completed && (
              <button
                type="button"
                onClick={completeEveningReview}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-semibold hover:bg-violet-800"
              >
                <CheckCircle2 size={16} />
                Complete review
              </button>
            )}
          </div>
        </header>

        {eveningReview.completed && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/80 px-5 py-4 text-sm text-violet-900">
            Review completed. Memories written and tomorrow context saved.
          </div>
        )}

        {/* Morning Plan Summary */}
        <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 to-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-violet-800 uppercase tracking-wider mb-3">
            Today&apos;s Morning Plan Summary
          </h2>
          {morningPlan ? (
            <>
              <p className="text-sm font-semibold text-zinc-900">{morningPlan.primaryMission}</p>
              <p className="text-sm text-zinc-600 mt-2">{morningPlan.summary}</p>
              {morningPlan.topPriorities.length > 0 && (
                <ul className="mt-3 text-xs text-zinc-500 space-y-1">
                  {morningPlan.topPriorities.map((p, i) => (
                    <li key={p.id}>
                      {i + 1}. {p.title}{p.completed ? ' ✓' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500">No morning plan for today. You can still review the day.</p>
          )}
        </section>

        {/* Priority Completion */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target size={16} /> Priority Completion
          </h2>
          {allPriorities.length === 0 ? (
            <p className="text-sm text-zinc-500">No priorities from morning plan.</p>
          ) : (
            <div className="space-y-3">
              {allPriorities.map(title => {
                const done = eveningReview.completedPriorities.includes(title)
                return (
                  <div key={title} className="flex items-start gap-3 border border-zinc-100 rounded-xl p-4">
                    <button
                      type="button"
                      onClick={() => togglePriority(title, !done)}
                      className={`mt-0.5 w-5 h-5 rounded border shrink-0 ${
                        done ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300'
                      }`}
                    />
                    <p className={`text-sm font-medium ${done ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                      {title}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ListSection
            title="Wins"
            icon={Trophy}
            items={eveningReview.wins}
            placeholder="What went well today?"
            onAdd={v => addItem('wins', v)}
            onRemove={i => removeItem('wins', i)}
            accent="emerald"
          />
          <ListSection
            title="Blockers"
            icon={AlertTriangle}
            items={eveningReview.blockers}
            placeholder="What got in the way?"
            onAdd={v => addItem('blockers', v)}
            onRemove={i => removeItem('blockers', i)}
            accent="amber"
          />
        </div>

        <ListSection
          title="Lessons"
          icon={Lightbulb}
          items={eveningReview.lessons}
          placeholder="What did you learn?"
          onAdd={v => addItem('lessons', v)}
          onRemove={i => removeItem('lessons', i)}
          accent="violet"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
              Reflection
            </h2>
            <textarea
              className={inputClass}
              rows={4}
              placeholder="How did today feel overall?"
              value={eveningReview.reflection}
              onChange={e => updateEveningReview({ reflection: e.target.value })}
            />
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
              Tomorrow Notes
            </h2>
            <textarea
              className={inputClass}
              rows={4}
              placeholder="What should tomorrow-you know?"
              value={eveningReview.tomorrowNotes}
              onChange={e => updateEveningReview({ tomorrowNotes: e.target.value })}
            />
          </section>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
            Energy / Mood
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {(['low', 'medium', 'high'] as EnergyLevel[]).map(level => (
              <button
                key={level}
                type="button"
                onClick={() => updateEveningReview({ energyLevel: level })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${
                  eveningReview.energyLevel === level
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <input
            className={inputClass}
            placeholder="Mood (optional)"
            value={eveningReview.mood ?? ''}
            onChange={e => updateEveningReview({ mood: e.target.value })}
          />
        </section>

        {dailyLearningLoop && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Brain size={16} /> Generated Memories
              </h2>
              <p className="text-xs text-zinc-500 mb-3">
                {eveningReview.memoriesWritten
                  ? `${eveningReview.generatedMemories.length} memories written on completion.`
                  : 'Memories will be created when you complete the review.'}
              </p>
              <ul className="text-sm text-zinc-600 space-y-1">
                {dailyLearningLoop.generatedMemoryInputs.map((m, i) => (
                  <li key={i}>• {m.title}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
              <h2 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen size={16} /> Suggested Knowledge
              </h2>
              {suggestions.length === 0 ? (
                <p className="text-sm text-zinc-500">Add lessons to generate knowledge suggestions.</p>
              ) : (
                <ul className="space-y-3">
                  {suggestions.map((s, i) => {
                    const saved = isSuggestionSaved(s)
                    return (
                      <li key={i} className="rounded-xl bg-white border border-indigo-100 p-4">
                        <p className="text-sm font-semibold text-zinc-900">{s.suggestedTitle}</p>
                        <p className="text-xs text-zinc-500 mt-1">{s.suggestedPrinciple}</p>
                        {!saved ? (
                          <button
                            type="button"
                            onClick={() => saveKnowledgeSuggestion(s)}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                          >
                            <Sparkles size={12} />
                            Save as knowledge
                          </button>
                        ) : (
                          <p className="mt-3 text-xs text-emerald-600 font-medium">Saved to Knowledge Engine</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        )}

        {(tomorrowContext || dailyLearningLoop?.tomorrowContext) && (
          <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
            <h2 className="text-sm font-semibold text-violet-800 uppercase tracking-wider mb-3">
              Tomorrow Context Preview
            </h2>
            <p className="text-sm text-zinc-700">
              {dailyLearningLoop?.tomorrowContext.suggestedFocus
                && `Focus: ${dailyLearningLoop.tomorrowContext.suggestedFocus}`}
            </p>
            {dailyLearningLoop?.tomorrowContext.carryOverPriorities.length ? (
              <p className="text-xs text-zinc-500 mt-2">
                Carry over: {dailyLearningLoop.tomorrowContext.carryOverPriorities.join(', ')}
              </p>
            ) : null}
            {dailyLearningLoop?.tomorrowContext.warnings.length ? (
              <ul className="text-xs text-amber-800 mt-2 space-y-1">
                {dailyLearningLoop.tomorrowContext.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            ) : null}
          </section>
        )}
      </div>
    </div>
  )
}
