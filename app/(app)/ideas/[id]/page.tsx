'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Sparkles, AlertCircle, Loader2, RotateCcw, ArrowLeft, Pencil,
  TrendingUp, Gauge, Rocket,
} from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import { createClient } from '@/lib/supabase/client'
import * as db from '@/lib/db'
import {
  toProjectStatus, toProjectPriority, toTaskPriority, toRiskSeverity,
} from '@/lib/idea'
import IdeaModal from '@/components/idea/IdeaModal'
import IdeaAnalysisCard from '@/components/idea/IdeaAnalysisCard'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'
import type { IdeaAnalysis } from '@/lib/types'

export default function IdeaDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const { appState, isHydrated, loadError, createProject, addTask, addRisk, addRoadmapItem, updateIdea, createLink } = useAppContext()
  const idea = appState.ideas.find(i => i.id === id)

  const [analyses, setAnalyses]           = useState<IdeaAnalysis[]>([])
  const [analysesLoading, setAnalysesLoading] = useState(true)
  const [analysesError, setAnalysesError] = useState<string | null>(null)

  const [analysing, setAnalysing]   = useState(false)
  const [analyseError, setAnalyseError] = useState<string | null>(null)

  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)

  const [showEdit, setShowEdit] = useState(false)

  const loadAnalyses = useCallback(async () => {
    if (!id) return
    setAnalysesLoading(true)
    setAnalysesError(null)
    try {
      setAnalyses(await db.loadIdeaAnalyses(supabase, id))
    } catch (err) {
      console.error('[FounderOS] failed to load idea analyses:', err)
      setAnalysesError(err instanceof Error ? err.message : 'Failed to load analyses.')
    } finally {
      setAnalysesLoading(false)
    }
  }, [supabase, id])

  useEffect(() => { void loadAnalyses() }, [loadAnalyses])

  // Redirect to the vault if the idea doesn't exist (after load).
  useEffect(() => {
    if (isHydrated && !loadError && !idea) router.replace('/ideas')
  }, [isHydrated, loadError, idea, router])

  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading idea…" /></div>
  if (loadError)   return <div className="p-6"><ErrorScreen message={loadError} /></div>
  if (!idea)       return <div className="p-6"><LoadingScreen label="Redirecting…" /></div>

  const latest = analyses[0]
  const previous = analyses.slice(1)

  async function analyse() {
    setAnalysing(true)
    setAnalyseError(null)
    try {
      const res = await fetch('/api/idea-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea_id: id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Could not analyse the idea. Please try again.')
      }
      const data = await res.json() as { analysis: IdeaAnalysis }
      setAnalyses(prev => [data.analysis, ...prev])
    } catch (err) {
      setAnalyseError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setAnalysing(false)
    }
  }

  async function turnIntoProject() {
    if (!idea) return
    setConverting(true)
    setConvertError(null)
    try {
      const sp = latest?.suggestedProject

      // Create the project (from the suggestion if available, else from idea details).
      const project = await createProject({
        title:       sp?.title || idea.title,
        description: sp?.description || idea.description,
        goal:        sp?.goal || idea.solution || '',
        status:      toProjectStatus(sp?.status || 'planning'),
        priority:    toProjectPriority(sp?.priority || 'medium'),
        progress:    sp?.progress ?? 0,
      })

      // Create suggested tasks, risks and roadmap items (only when an analysis exists).
      if (latest) {
        for (const t of latest.suggestedTasks) {
          await addTask({ projectId: project.id, title: t.title, description: t.description, priority: toTaskPriority(t.priority), status: 'todo' })
        }
        for (const r of latest.suggestedRisks) {
          await addRisk({ projectId: project.id, title: r.title, description: r.description, severity: toRiskSeverity(r.severity), mitigation: r.mitigation, status: 'open' })
        }
        let order = 1
        for (const r of latest.suggestedRoadmapItems) {
          await addRoadmapItem({ projectId: project.id, title: r.title, description: r.description, stage: r.stage || 'Next', status: 'planned', sortOrder: order++ })
        }
      }

      // Knowledge graph: record where this project came from (best-effort).
      try {
        await createLink({
          sourceType: 'idea', sourceId: idea.id,
          targetType: 'project', targetId: project.id,
          relationshipType: 'converted_to', description: 'Idea was turned into this project',
        })
        if (latest) {
          await createLink({
            sourceType: 'idea_analysis', sourceId: latest.id,
            targetType: 'project', targetId: project.id,
            relationshipType: 'suggested_by', description: 'Project suggested by idea analysis',
          })
        }
      } catch (linkErr) {
        console.error('[FounderOS] failed to create idea→project links:', linkErr)
      }

      await updateIdea(idea.id, { status: 'Turned Into Project' })
      router.push(`/projects/${project.id}`)
    } catch (err) {
      setConverting(false)
      setConvertError(err instanceof Error ? err.message : 'Could not turn this idea into a project. Please try again.')
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link href="/ideas" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
        <ArrowLeft size={13} /> Idea Vault
      </Link>

      {/* Idea details */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-zinc-900">{idea.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={idea.status} size="md" />
              <span className="flex items-center gap-1 text-xs text-emerald-600"><TrendingUp size={12} /> Potential {idea.potentialScore}/10</span>
              <span className="flex items-center gap-1 text-xs text-orange-600"><Gauge size={12} /> Difficulty {idea.difficultyScore}/10</span>
            </div>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
          >
            <Pencil size={12} /> Edit
          </button>
        </div>

        {idea.description && <DetailField label="Description" value={idea.description} />}
        {idea.targetUser && <DetailField label="Target user" value={idea.targetUser} />}
        {idea.problem && <DetailField label="Problem" value={idea.problem} />}
        {idea.solution && <DetailField label="Possible solution" value={idea.solution} />}

        {idea.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {idea.tags.map(tag => (
              <span key={tag} className="text-[11px] font-medium text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5">{tag}</span>
            ))}
          </div>
        )}

        <p className="text-[11px] text-zinc-400">Created {new Date(idea.createdAt).toLocaleDateString()}</p>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            onClick={analyse}
            disabled={analysing}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {analysing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {analysing ? 'Analysing…' : 'Analyse Idea'}
          </button>
          <button
            onClick={turnIntoProject}
            disabled={converting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50 transition-colors"
          >
            {converting ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
            {converting ? 'Creating project…' : 'Turn Into Project'}
          </button>
        </div>
        {!latest && !analysesLoading && (
          <p className="text-xs text-zinc-400">
            Tip: analyse the idea first for a richer project with suggested tasks, risks and roadmap. Turning it into a project now will create a basic project from these details.
          </p>
        )}
        {convertError && <p className="text-xs text-red-600">{convertError}</p>}
      </div>

      {/* Analysing state */}
      {analysing && (
        <div className="bg-white rounded-xl border border-zinc-100 py-14 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
            <Sparkles size={20} className="text-zinc-400 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">FounderOS is analysing your idea...</p>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">Assessing the target user, problem, market, difficulty, risks and MVP.</p>
        </div>
      )}

      {/* Analyse error */}
      {analyseError && !analysing && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 leading-relaxed">{analyseError}</p>
            <button onClick={analyse} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
              <RotateCcw size={11} /> Try again
            </button>
          </div>
        </div>
      )}

      {/* Analyses */}
      {analysesLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-zinc-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading analyses…</span>
        </div>
      ) : analysesError ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 leading-relaxed">{analysesError}</p>
            <button onClick={() => void loadAnalyses()} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
              <RotateCcw size={11} /> Retry
            </button>
          </div>
        </div>
      ) : analyses.length === 0 ? (
        !analysing && (
          <div className="bg-white rounded-xl border border-zinc-100 py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
              <Sparkles size={20} className="text-zinc-300" />
            </div>
            <p className="text-sm font-semibold text-zinc-700">No analysis yet</p>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">Click Analyse Idea and FounderOS will assess it honestly and suggest a project.</p>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Latest analysis</h2>
            <IdeaAnalysisCard analysis={latest} />
          </div>
          {previous.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Previous analyses ({previous.length})</h2>
              {previous.map(a => <IdeaAnalysisCard key={a.id} analysis={a} />)}
            </div>
          )}
        </div>
      )}

      {showEdit && <IdeaModal idea={idea} onClose={() => setShowEdit(false)} />}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  )
}
