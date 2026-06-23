'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarCheck2, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loadWeeklyReviews } from '@/lib/db'
import WeeklyReviewCard from '@/components/review/WeeklyReviewCard'
import EmptyState from '@/components/ui/EmptyState'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'
import { useAppContext } from '@/contexts/AppContext'
import type { WeeklyReview } from '@/lib/types'

export default function WeeklyReviewPage() {
  const { isHydrated, loadError } = useAppContext()
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [loadReviewsError, setLoadReviewsError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const reloadReviews = useCallback(async () => {
    setLoadReviewsError(null)
    try {
      const supabase = createClient()
      const data = await loadWeeklyReviews(supabase)
      setReviews(data)
    } catch (err) {
      console.error('[FounderOS] loadWeeklyReviews failed:', err)
      setLoadReviewsError('Could not load weekly reviews.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    void reloadReviews()
  }, [isHydrated, reloadReviews])

  async function generate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/weekly-review', { method: 'POST' })
      const data = await res.json() as { review?: WeeklyReview; error?: string }
      if (!res.ok) {
        setGenerateError(data.error ?? 'Could not generate weekly review.')
        return
      }
      if (data.review) {
        setReviews(prev => [data.review!, ...prev.filter(r => r.id !== data.review!.id)])
      }
    } catch {
      setGenerateError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading weekly review…" /></div>
  if (loadError) return <div className="p-6"><ErrorScreen message={loadError} /></div>

  const latest = reviews[0]
  const previous = reviews.slice(1)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center">
              <CalendarCheck2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">Weekly Review</h1>
              <p className="text-sm text-zinc-500">Reflect on the week. Plan the next one.</p>
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
          {generating ? 'Generating…' : 'Generate Weekly Review'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <p className="text-sm text-zinc-600 leading-relaxed">
          FounderOS analyses your entire workspace — projects, tasks, risks, decisions, ideas,
          files, project reviews and memory links — then produces a clear weekly summary and
          next-week focus plan.
        </p>
      </div>

      {generateError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <p className="text-sm text-red-600">{generateError}</p>
        </div>
      )}

      {loading ? (
        <LoadingScreen label="Loading reviews…" />
      ) : loadReviewsError ? (
        <ErrorScreen message={loadReviewsError} />
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-100">
          <EmptyState
            icon={CalendarCheck2}
            title="No weekly review yet"
            description="Generate your first weekly review to get a cross-workspace summary and next-week focus plan."
            action={{ label: 'Generate Weekly Review', onClick: () => void generate() }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Latest review</h2>
            <WeeklyReviewCard review={latest} defaultExpanded />
          </div>

          {previous.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Previous reviews</h2>
              {previous.map(r => (
                <WeeklyReviewCard key={r.id} review={r} defaultExpanded={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
