'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Circle, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAppContext } from '@/contexts/AppContext'
import { computeStartHereSteps, shouldShowStartHere } from '@/lib/onboarding'

export default function StartHereSection() {
  const { appState, isHydrated, reload } = useAppContext()
  const [analysedIds, setAnalysedIds] = useState<Set<string>>(new Set())
  const [hasProjectReview, setHasProjectReview] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

  useEffect(() => {
    if (!isHydrated) return
    const supabase = createClient()
    void Promise.all([
      supabase.from('idea_analyses').select('idea_id').then(({ data }) => {
        if (data) setAnalysedIds(new Set(data.map(r => r.idea_id)))
      }),
      supabase.from('project_reviews').select('id', { count: 'exact', head: true }).then(({ count }) => {
        setHasProjectReview((count ?? 0) > 0)
      }),
    ]).catch(err => console.error('[StartHere] failed to load progress:', err))
  }, [isHydrated, appState.ideas.length, appState.projects.length])

  const steps = useMemo(
    () => computeStartHereSteps(appState, { analysedIdeaIds: analysedIds, hasProjectReview }),
    [appState, analysedIds, hasProjectReview],
  )

  const visible = shouldShowStartHere(steps, appState)
  if (!isHydrated || !visible) return null

  async function loadDemo() {
    setLoadingDemo(true)
    setDemoError(null)
    try {
      const res = await fetch('/api/demo-workspace', { method: 'POST' })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not load demo workspace.')
      await reload()
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoadingDemo(false)
    }
  }

  const done = steps.filter(s => s.complete).length

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-900">Start Here</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            New to FounderOS? Follow these steps to go from idea to execution.
          </p>
        </div>
        <span className="text-xs font-medium text-zinc-400 shrink-0">{done}/{steps.length} done</span>
      </div>

      <div className="divide-y divide-zinc-50">
        {steps.map(step => (
          <div key={step.id} className="px-5 py-3.5 flex items-start gap-3">
            <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
              step.complete ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
            }`}>
              {step.complete ? <Check size={12} /> : <Circle size={10} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.complete ? 'text-zinc-500 line-through' : 'text-zinc-800'}`}>
                {step.title}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{step.description}</p>
            </div>
            {!step.complete && step.href && (
              <Link
                href={step.href}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Go <ArrowRight size={12} />
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-zinc-400">Prefer to explore first? Load a demo workspace with sample data.</p>
        <button
          type="button"
          onClick={() => void loadDemo()}
          disabled={loadingDemo}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
        >
          {loadingDemo ? <Loader2 size={12} className="animate-spin" /> : null}
          Load Demo Workspace
        </button>
      </div>
      {demoError && <p className="px-5 pb-4 text-xs text-red-600">{demoError}</p>}
    </div>
  )
}
