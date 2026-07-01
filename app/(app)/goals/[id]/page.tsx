'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Pencil, Sparkles, Link2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loadGoalLinks, loadGoalReviews } from '@/lib/db'
import { useAppContext } from '@/contexts/AppContext'
import GoalModal from '@/components/goals/GoalModal'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'
import type { GoalLink, GoalReview } from '@/lib/types'

export default function GoalDetailPage() {
  const params = useParams()
  const goalId = params.id as string
  const { appState, isHydrated, loadError, linkGoalToProject } = useAppContext()
  const goal = appState.goals.find(g => g.id === goalId)

  const [links, setLinks] = useState<GoalLink[]>([])
  const [reviews, setReviews] = useState<GoalReview[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [linkProjectId, setLinkProjectId] = useState('')
  const [linking, setLinking] = useState(false)

  const reload = useCallback(async () => {
    const supabase = createClient()
    const [l, r] = await Promise.all([
      loadGoalLinks(supabase, goalId),
      loadGoalReviews(supabase, goalId),
    ])
    setLinks(l)
    setReviews(r)
  }, [goalId])

  useEffect(() => {
    if (!isHydrated || !goalId) return
    void reload()
  }, [isHydrated, goalId, reload])

  const linkedProjects = useMemo(() =>
    links
      .filter(l => l.entityType === 'project')
      .map(l => appState.projects.find(p => p.id === l.entityId))
      .filter(Boolean),
  [links, appState.projects])

  async function generateReview() {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/goal-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId }),
      })
      const data = await res.json() as { review?: GoalReview; error?: string }
      if (!res.ok || !data.review) {
        setGenError(data.error ?? 'Could not generate goal review.')
        return
      }
      setReviews(prev => [data.review!, ...prev])
    } catch {
      setGenError('Could not generate goal review.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleLinkProject() {
    if (!linkProjectId) return
    setLinking(true)
    try {
      await linkGoalToProject(goalId, linkProjectId)
      setLinkProjectId('')
      await reload()
    } catch {
      // ignore
    } finally {
      setLinking(false)
    }
  }

  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading goal…" /></div>
  if (loadError) return <div className="p-6"><ErrorScreen message={loadError} /></div>
  if (!goal) return <div className="p-6"><ErrorScreen message="Goal not found." /></div>

  const latestReview = reviews[0]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/goals" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800">
        <ArrowLeft size={12} /> All goals
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{goal.title}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{goal.category} · {goal.priority} · {goal.status} · {goal.progress}%</p>
        </div>
        <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50">
          <Pencil size={13} /> Edit
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {goal.description && (
          <div className="bg-white rounded-xl border border-zinc-100 p-4 sm:col-span-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{goal.description}</p>
          </div>
        )}
        {goal.whyItMatters && (
          <div className="bg-white rounded-xl border border-zinc-100 p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Why it matters</p>
            <p className="text-sm text-zinc-700">{goal.whyItMatters}</p>
          </div>
        )}
        {goal.successCriteria && (
          <div className="bg-white rounded-xl border border-zinc-100 p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Success criteria</p>
            <p className="text-sm text-zinc-700">{goal.successCriteria}</p>
          </div>
        )}
        {goal.timeframe && (
          <div className="bg-white rounded-xl border border-zinc-100 p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Timeframe</p>
            <p className="text-sm text-zinc-700">{goal.timeframe}</p>
          </div>
        )}
        {goal.constraints && (
          <div className="bg-white rounded-xl border border-zinc-100 p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Constraints</p>
            <p className="text-sm text-zinc-700">{goal.constraints}</p>
          </div>
        )}
      </div>

      <section className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2"><Link2 size={14} /> Linked worlds</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          {linkedProjects.length === 0 ? (
            <p className="text-sm text-zinc-500">No worlds linked yet.</p>
          ) : (
            <ul className="space-y-2">
              {linkedProjects.map(p => p && (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="text-sm text-zinc-800 hover:underline">
                    [{p.worldType}] {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 pt-2">
            <select
              value={linkProjectId}
              onChange={e => setLinkProjectId(e.target.value)}
              className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2"
            >
              <option value="">Link a world…</option>
              {appState.projects.filter(p => p.status !== 'archived').map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!linkProjectId || linking}
              onClick={() => void handleLinkProject()}
              className="px-3 py-2 text-sm bg-zinc-900 text-white rounded-lg disabled:opacity-50"
            >
              Link
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Goal review</h2>
          <button
            onClick={() => void generateReview()}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-lg disabled:opacity-50"
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Generate review
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {genError && <p className="text-sm text-red-600">{genError}</p>}
          {latestReview ? (
            <div className="space-y-3 text-sm text-zinc-700">
              <div><p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Progress</p>{latestReview.progressReview}</div>
              <div><p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Blockers</p>{latestReview.blockers}</div>
              <div><p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Conflicts</p>{latestReview.conflicts}</div>
              <div><p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Next actions</p>{latestReview.nextActions}</div>
              <div><p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Recommended focus</p>{latestReview.recommendedFocus}</div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No reviews yet. Generate one to analyse progress and blockers.</p>
          )}
        </div>
      </section>

      <GoalModal open={showEdit} onOpenChange={setShowEdit} goalId={goalId} initial={goal} />
    </div>
  )
}
