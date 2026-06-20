'use client'

import { useState } from 'react'
import {
  FileText, TrendingUp, CheckCircle2, AlertOctagon, ShieldAlert,
  GitFork, CalendarRange, Plus, Check, Loader2,
} from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import StatusBadge from '@/components/ui/StatusBadge'
import type { ProjectReview, TaskPriority } from '@/lib/types'

const PRIORITY_MAP: Record<string, TaskPriority> = { Low: 'low', Medium: 'medium', High: 'high' }

function Section({ icon: Icon, title, text }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  text: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-zinc-400" />
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</h4>
      </div>
      <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
        {text?.trim() || <span className="text-zinc-400">Not enough information yet.</span>}
      </p>
    </div>
  )
}

export default function ReviewCard({ review }: { review: ProjectReview }) {
  const { addTask, addRoadmapItem, roadmapItems } = useProjectContext()
  const { createLink } = useAppContext()

  // Track which suggestions were added (by index) and their in-flight state.
  const [addedTasks, setAddedTasks]       = useState<Record<number, 'loading' | 'done'>>({})
  const [addedRoadmap, setAddedRoadmap]   = useState<Record<number, 'loading' | 'done'>>({})

  async function handleAddTask(index: number) {
    const t = review.suggestedTasks[index]
    if (!t || addedTasks[index]) return
    setAddedTasks(prev => ({ ...prev, [index]: 'loading' }))
    try {
      const created = await addTask({
        title: t.title,
        description: t.description,
        priority: PRIORITY_MAP[t.priority] ?? 'medium',
        status: 'todo',
      })
      try {
        await createLink({
          sourceType: 'project_review', sourceId: review.id,
          targetType: 'task', targetId: created.id,
          relationshipType: 'suggested_by', description: 'Suggested by project review',
        })
      } catch (linkErr) {
        console.error('[FounderOS] failed to create review→task link:', linkErr)
      }
      setAddedTasks(prev => ({ ...prev, [index]: 'done' }))
    } catch {
      setAddedTasks(prev => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    }
  }

  async function handleAddRoadmap(index: number) {
    const r = review.suggestedRoadmapItems[index]
    if (!r || addedRoadmap[index]) return
    setAddedRoadmap(prev => ({ ...prev, [index]: 'loading' }))
    try {
      const created = await addRoadmapItem({
        title: r.title,
        description: r.description,
        stage: r.stage || 'Next',
        status: 'planned',
        sortOrder: roadmapItems.length + 1 + index,
      })
      try {
        await createLink({
          sourceType: 'project_review', sourceId: review.id,
          targetType: 'roadmap_item', targetId: created.id,
          relationshipType: 'suggested_by', description: 'Suggested by project review',
        })
      } catch (linkErr) {
        console.error('[FounderOS] failed to create review→roadmap link:', linkErr)
      }
      setAddedRoadmap(prev => ({ ...prev, [index]: 'done' }))
    } catch {
      setAddedRoadmap(prev => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    }
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/60 flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">
          Generated {new Date(review.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="p-5 space-y-5">
        <Section icon={FileText}      title="Summary"        text={review.summary} />
        <Section icon={TrendingUp}    title="Progress Review" text={review.progressReview} />
        <Section icon={CheckCircle2}  title="Completed Work"  text={review.completedWork} />
        <Section icon={AlertOctagon}  title="Blockers"        text={review.blockers} />
        <Section icon={ShieldAlert}   title="Key Risks"       text={review.keyRisks} />
        <Section icon={GitFork}       title="Key Decisions"   text={review.keyDecisions} />
        <Section icon={CalendarRange} title="Next 7-Day Plan" text={review.next7DayPlan} />

        {/* Suggested tasks */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-zinc-400" />
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Suggested Tasks <span className="text-zinc-300">({review.suggestedTasks.length})</span>
            </h4>
          </div>
          {review.suggestedTasks.length === 0 ? (
            <p className="text-sm text-zinc-400">No task suggestions.</p>
          ) : (
            <div className="space-y-2">
              {review.suggestedTasks.map((t, i) => {
                const state = addedTasks[i]
                return (
                  <div key={i} className="flex items-start gap-3 border border-zinc-100 rounded-lg p-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-800 truncate">{t.title}</p>
                        <StatusBadge status={t.priority.toLowerCase()} />
                      </div>
                      {t.description && <p className="text-xs text-zinc-500 leading-relaxed">{t.description}</p>}
                    </div>
                    <AddButton
                      state={state}
                      idleLabel="Add Task"
                      onClick={() => handleAddTask(i)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Suggested roadmap items */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GitFork size={13} className="text-zinc-400" />
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Suggested Roadmap Items <span className="text-zinc-300">({review.suggestedRoadmapItems.length})</span>
            </h4>
          </div>
          {review.suggestedRoadmapItems.length === 0 ? (
            <p className="text-sm text-zinc-400">No roadmap suggestions.</p>
          ) : (
            <div className="space-y-2">
              {review.suggestedRoadmapItems.map((r, i) => {
                const state = addedRoadmap[i]
                return (
                  <div key={i} className="flex items-start gap-3 border border-zinc-100 rounded-lg p-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-800 truncate">{r.title}</p>
                        {r.stage && <span className="text-[11px] font-medium text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">{r.stage}</span>}
                      </div>
                      {r.description && <p className="text-xs text-zinc-500 leading-relaxed">{r.description}</p>}
                    </div>
                    <AddButton
                      state={state}
                      idleLabel="Add to Roadmap"
                      onClick={() => handleAddRoadmap(i)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AddButton({ state, idleLabel, onClick }: {
  state?: 'loading' | 'done'
  idleLabel: string
  onClick: () => void
}) {
  if (state === 'done') {
    return (
      <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg">
        <Check size={12} /> Added
      </span>
    )
  }
  return (
    <button
      onClick={onClick}
      disabled={state === 'loading'}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50 transition-colors"
    >
      {state === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
      {idleLabel}
    </button>
  )
}
