'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileText, CheckCircle2, FolderKanban, AlertOctagon, GitFork, ShieldAlert,
  Lightbulb, Upload, Network, Target, Plus, Check, Loader2, Sparkles,
} from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import StatusBadge from '@/components/ui/StatusBadge'
import type { WeeklyReview, TaskPriority } from '@/lib/types'

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

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(weekEnd + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`
}

export default function WeeklyReviewCard({ review, defaultExpanded = true }: {
  review: WeeklyReview
  defaultExpanded?: boolean
}) {
  const { appState, addTask, createLink } = useAppContext()
  const { projects } = appState

  const [expanded, setExpanded] = useState(defaultExpanded)
  const [addedTasks, setAddedTasks] = useState<Record<number, 'loading' | 'done'>>({})
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')

  function resolveProjectId(suggestedId?: string): string | null {
    if (!suggestedId) return null
    return projects.some(p => p.id === suggestedId) ? suggestedId : null
  }

  async function addSuggestedTask(index: number, projectId: string) {
    const t = review.suggestedTasks[index]
    if (!t || addedTasks[index] || !projectId) return
    setAddedTasks(prev => ({ ...prev, [index]: 'loading' }))
    setPickerIndex(null)
    try {
      const created = await addTask({
        projectId,
        title: t.title,
        description: t.description,
        priority: PRIORITY_MAP[t.priority] ?? 'medium',
        status: 'todo',
      })
      try {
        await createLink({
          sourceType: 'weekly_review',
          sourceId: review.id,
          targetType: 'task',
          targetId: created.id,
          relationshipType: 'suggested_by',
          description: 'Task suggested by weekly review',
        })
      } catch (linkErr) {
        console.error('[FounderOS] failed to create weekly review→task link:', linkErr)
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

  function handleAddTaskClick(index: number) {
    const t = review.suggestedTasks[index]
    const projectId = resolveProjectId(t?.projectId)
    if (projectId) {
      void addSuggestedTask(index, projectId)
    } else {
      setPickerIndex(index)
      setSelectedProjectId(projects[0]?.id ?? '')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/60 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
      >
        <div>
          <p className="text-xs font-medium text-zinc-500">
            {formatWeekRange(review.weekStart, review.weekEnd)}
          </p>
          <p className="text-sm font-semibold text-zinc-800 mt-0.5 line-clamp-1">
            {review.summary || 'Weekly review'}
          </p>
        </div>
        <span className="text-xs text-zinc-400 shrink-0 ml-3">
          {new Date(review.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </button>

      {expanded && (
        <div className="p-5 space-y-5">
          <Section icon={FileText} title="Summary" text={review.summary} />
          <Section icon={CheckCircle2} title="Completed Work" text={review.completedWork} />
          <Section icon={FolderKanban} title="Active Projects" text={review.activeProjects} />
          <Section icon={AlertOctagon} title="Stuck Projects" text={review.stuckProjects} />
          <Section icon={GitFork} title="Key Decisions" text={review.keyDecisions} />
          <Section icon={ShieldAlert} title="Key Risks" text={review.keyRisks} />
          <Section icon={Lightbulb} title="Ideas to Revisit" text={review.ideasToRevisit} />
          <Section icon={Upload} title="Files Added" text={review.filesAdded} />
          <Section icon={Network} title="Memory Insights" text={review.memoryInsights} />
          <Section icon={Target} title="Next Week Focus" text={review.nextWeekFocus} />

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
                  const knownProject = resolveProjectId(t.projectId)
                  const projectTitle = knownProject ? projects.find(p => p.id === knownProject)?.title : undefined
                  return (
                    <div key={i}>
                      <div className="flex items-start gap-3 border border-zinc-100 rounded-lg p-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-zinc-800">{t.title}</p>
                            <StatusBadge status={t.priority.toLowerCase()} />
                            {projectTitle && (
                              <span className="text-[10px] text-zinc-400 bg-zinc-50 rounded-full px-2 py-0.5">{projectTitle}</span>
                            )}
                          </div>
                          {t.description && <p className="text-xs text-zinc-500 leading-relaxed">{t.description}</p>}
                        </div>
                        <AddButton
                          state={state}
                          idleLabel="Add Task"
                          onClick={() => handleAddTaskClick(i)}
                        />
                      </div>
                      {pickerIndex === i && (
                        <div className="mt-2 ml-3 p-3 border border-zinc-200 rounded-lg bg-zinc-50 space-y-2">
                          <p className="text-xs text-zinc-500">Choose a project for this task:</p>
                          <select
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
                          >
                            {projects.filter(p => p.status !== 'archived').map(p => (
                              <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={!selectedProjectId}
                              onClick={() => void addSuggestedTask(i, selectedProjectId)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 disabled:opacity-40"
                            >
                              Add to project
                            </button>
                            <button
                              type="button"
                              onClick={() => setPickerIndex(null)}
                              className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-zinc-400" />
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Suggested Project Reviews <span className="text-zinc-300">({review.suggestedProjectReviews.length})</span>
              </h4>
            </div>
            {review.suggestedProjectReviews.length === 0 ? (
              <p className="text-sm text-zinc-400">No project review suggestions.</p>
            ) : (
              <div className="space-y-2">
                {review.suggestedProjectReviews.map((r, i) => {
                  const project = projects.find(p => p.id === r.projectId)
                  return (
                    <div key={i} className="flex items-start gap-3 border border-zinc-100 rounded-lg p-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium text-zinc-800">
                          {project?.title ?? 'Unknown project'}
                        </p>
                        <p className="text-xs text-zinc-500 leading-relaxed">{r.reason}</p>
                      </div>
                      {project && (
                        <Link
                          href={`/projects/${project.id}/review`}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                        >
                          <Sparkles size={12} /> Review Project
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
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
      type="button"
      onClick={onClick}
      disabled={state === 'loading'}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50 transition-colors"
    >
      {state === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
      {idleLabel}
    </button>
  )
}
