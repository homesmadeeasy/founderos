'use client'

import { useState } from 'react'
import { Sparkles, AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import ReviewCard from '@/components/review/ReviewCard'
import StatusBadge from '@/components/ui/StatusBadge'
import type { ProjectReview } from '@/lib/types'

export default function ProjectReviewPage() {
  const {
    project, tasks, notes, decisions, risks, roadmapItems, messages,
    reviews, reviewsLoading, reviewsError, prependReview, reloadReviews,
  } = useProjectContext()

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState<string | null>(null)

  const openTasks = tasks.filter(t => t.status !== 'done').length

  async function generate() {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/project-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Could not generate the review. Please try again.')
      }
      const data = await res.json() as { review: ProjectReview }
      prependReview(data.review)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const [latest, ...previous] = reviews

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Heading */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-zinc-900">Project Review</h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
            FounderOS analyses your project state and generates an honest review with a 7-day plan and next steps.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? 'Reviewing…' : 'Generate Review'}
        </button>
      </div>

      {/* Project context summary */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">What will be reviewed</p>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <StatusBadge status={project.status} size="md" />
          <StatusBadge status={project.priority} size="md" />
          <span className="text-xs text-zinc-400">{project.progress}% progress</span>
        </div>
        {project.goal && <p className="text-sm text-zinc-600 leading-relaxed mb-3">{project.goal}</p>}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
          <Stat label="Open tasks" value={openTasks} />
          <Stat label="Tasks" value={tasks.length} />
          <Stat label="Notes" value={notes.length} />
          <Stat label="Decisions" value={decisions.length} />
          <Stat label="Risks" value={risks.length} />
          <Stat label="Roadmap" value={roadmapItems.length} />
        </div>
        <p className="text-[11px] text-zinc-400 mt-3">
          The {Math.min(messages.length, 15)} most recent chat messages are also included.
        </p>
      </div>

      {/* Generating state */}
      {generating && (
        <div className="bg-white rounded-xl border border-zinc-100 py-14 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
            <Sparkles size={20} className="text-zinc-400 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">FounderOS is reviewing your project...</p>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
            Analysing your goal, tasks, risks, decisions, roadmap and recent chat.
          </p>
        </div>
      )}

      {/* Generation error */}
      {genError && !generating && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 leading-relaxed">{genError}</p>
            <button
              onClick={generate}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <RotateCcw size={11} /> Try again
            </button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviewsLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-zinc-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading reviews…</span>
        </div>
      ) : reviewsError ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 leading-relaxed">{reviewsError}</p>
            <button
              onClick={() => void reloadReviews()}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <RotateCcw size={11} /> Retry
            </button>
          </div>
        </div>
      ) : reviews.length === 0 ? (
        !generating && (
          <div className="bg-white rounded-xl border border-zinc-100 py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
              <Sparkles size={20} className="text-zinc-300" />
            </div>
            <p className="text-sm font-semibold text-zinc-700">No project review yet</p>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Click Generate Review and FounderOS will analyse the project and suggest next steps.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-6">
          {/* Latest review */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Latest review</h2>
            <ReviewCard review={latest} />
          </div>

          {/* History */}
          {previous.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Previous reviews ({previous.length})
              </h2>
              {previous.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-50 rounded-lg py-2">
      <p className="text-sm font-bold text-zinc-800">{value}</p>
      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</p>
    </div>
  )
}
