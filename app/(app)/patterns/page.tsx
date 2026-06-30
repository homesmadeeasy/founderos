'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GitBranch, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loadPatternAnalyses } from '@/lib/db'
import { computeDataSufficiency } from '@/lib/pattern-analysis'
import PatternAnalysisCard from '@/components/patterns/PatternAnalysisCard'
import EmptyState from '@/components/ui/EmptyState'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'
import { useAppContext } from '@/contexts/AppContext'
import type { PatternAnalysis } from '@/lib/types'

export default function PatternsPage() {
  const { appState, isHydrated, loadError } = useAppContext()
  const [analyses, setAnalyses] = useState<PatternAnalysis[]>([])
  const [reviewCounts, setReviewCounts] = useState({ projectReviews: 0, weeklyReviews: 0, dnaProfiles: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError2, setLoadError2] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const dataCounts = useMemo(() => {
    const { projects, tasks, ideas, decisions, risks } = appState
    return {
      projects: projects.length,
      activeProjects: projects.filter(p => p.status !== 'archived').length,
      tasks: tasks.length,
      openTasks: tasks.filter(t => t.status !== 'done').length,
      doneTasks: tasks.filter(t => t.status === 'done').length,
      ideas: ideas.length,
      decisions: decisions.length,
      risks: risks.length,
      openRisks: risks.filter(r => r.status === 'open').length,
      projectReviews: reviewCounts.projectReviews,
      weeklyReviews: reviewCounts.weeklyReviews,
      dnaProfiles: reviewCounts.dnaProfiles,
      files: appState.projectFiles.length,
    }
  }, [appState, reviewCounts])

  const sufficiency = useMemo(() => computeDataSufficiency(dataCounts), [dataCounts])

  const reloadAnalyses = useCallback(async () => {
    setLoadError2(null)
    try {
      const supabase = createClient()
      const [data, projectReviewsRes, weeklyReviewsRes, dnaRes] = await Promise.all([
        loadPatternAnalyses(supabase),
        supabase.from('project_reviews').select('id', { count: 'exact', head: true }),
        supabase.from('weekly_reviews').select('id', { count: 'exact', head: true }),
        supabase.from('project_dna').select('id', { count: 'exact', head: true }),
      ])
      setAnalyses(data)
      setReviewCounts({
        projectReviews: projectReviewsRes.count ?? 0,
        weeklyReviews: weeklyReviewsRes.count ?? 0,
        dnaProfiles: dnaRes.count ?? 0,
      })
    } catch (err) {
      console.error('[FounderOS] loadPatternAnalyses failed:', err)
      setLoadError2('Could not load pattern analyses.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    void reloadAnalyses()
  }, [isHydrated, reloadAnalyses])

  async function generate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/pattern-analysis', { method: 'POST' })
      const data = await res.json() as { analysis?: PatternAnalysis; error?: string }
      if (!res.ok) {
        setGenerateError(data.error ?? 'Could not generate pattern analysis.')
        return
      }
      if (data.analysis) {
        setAnalyses(prev => [data.analysis!, ...prev.filter(a => a.id !== data.analysis!.id)])
      }
    } catch {
      setGenerateError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading patterns…" /></div>
  if (loadError) return <div className="p-6"><ErrorScreen message={loadError} /></div>

  const latest = analyses[0]
  const previous = analyses.slice(1)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center">
              <GitBranch size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">Cross-Project Patterns</h1>
              <p className="text-sm text-zinc-500">Cross-project insights about how you work.</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? 'Analysing…' : 'Generate Pattern Analysis'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-3">
        <p className="text-sm text-zinc-600 leading-relaxed">
          FounderOS analyses patterns across your entire workspace — projects, ideas, tasks, risks,
          decisions, reviews, weekly reviews, files and Project DNA — to surface recurring strengths,
          weaknesses, bottlenecks and opportunities.
        </p>
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className={`font-medium rounded-full px-2.5 py-1 ${
            sufficiency.level === 'high' ? 'bg-emerald-50 text-emerald-700' :
            sufficiency.level === 'medium' ? 'bg-blue-50 text-blue-700' :
            'bg-orange-50 text-orange-700'
          }`}>
            {sufficiency.label}
          </span>
          <span className="text-zinc-400">
            {dataCounts.projects} projects · {dataCounts.tasks} tasks · {dataCounts.projectReviews + dataCounts.weeklyReviews} reviews · {dataCounts.dnaProfiles} DNA · {dataCounts.decisions} decisions · {dataCounts.risks} risks
          </span>
        </div>
        {sufficiency.level === 'low' && (
          <p className="text-xs text-zinc-400 leading-relaxed">
            FounderOS can generate early observations, but pattern detection becomes more accurate as you
            create more projects, tasks, reviews, decisions and Project DNA.
          </p>
        )}
      </div>

      {generateError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <p className="text-sm text-red-600">{generateError}</p>
        </div>
      )}

      {loading ? (
        <LoadingScreen label="Loading analyses…" />
      ) : loadError2 ? (
        <ErrorScreen message={loadError2} />
      ) : analyses.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-100">
          <EmptyState
            icon={GitBranch}
            title="No pattern analysis yet"
            description="Pattern detection becomes more accurate as FounderOS learns how you work across multiple projects, tasks, reviews and Project DNA."
            action={{ label: 'Generate Pattern Analysis', onClick: () => void generate() }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Latest analysis</h2>
            <PatternAnalysisCard analysis={latest} />
          </div>
          {previous.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Previous analyses</h2>
              {previous.map(a => (
                <PatternAnalysisCard key={a.id} analysis={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
