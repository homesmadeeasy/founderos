'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  CalendarCheck2, CheckCircle2, AlertOctagon, Target, Lightbulb, ArrowRight,
} from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'
import EmptyState from '@/components/ui/EmptyState'

function PreviewCard({
  title, count, desc, icon: Icon, accent,
}: {
  title: string
  count: number
  desc: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  accent: string
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={16} />
        </div>
        <span className="text-2xl font-semibold text-zinc-900 tabular-nums">{count}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-800">{title}</p>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function WeeklyReviewPage() {
  const { appState, isHydrated, loadError } = useAppContext()

  const stats = useMemo(() => {
    const { tasks, projects, ideas } = appState
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    const completedTasks = tasks.filter(t => t.status === 'done')
    const recentlyCompleted = completedTasks.filter(
      t => new Date(t.createdAt).getTime() >= weekAgo
    )

    const activeProjects = projects.filter(p => p.status !== 'archived')
    const stuckProjects = activeProjects.filter(p => {
      const openTasks = tasks.filter(t => t.projectId === p.id && t.status !== 'done').length
      const stale = Date.now() - new Date(p.updatedAt).getTime() > 14 * 24 * 60 * 60 * 1000
      return (p.progress < 30 && openTasks > 0) || stale
    })

    const upcomingPriorities = tasks.filter(
      t => t.status !== 'done' && t.priority === 'high'
    )

    const ideasReviewed = ideas.filter(
      i => i.status !== 'Raw' && i.status !== 'Archived'
    )

    return {
      completedTasks: recentlyCompleted.length || completedTasks.length,
      stuckProjects: stuckProjects.length,
      upcomingPriorities: upcomingPriorities.length,
      ideasReviewed: ideasReviewed.length,
      hasData: projects.length > 0 || ideas.length > 0 || tasks.length > 0,
    }
  }, [appState])

  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading weekly review…" /></div>
  if (loadError)   return <div className="p-6"><ErrorScreen message={loadError} /></div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
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

      <div className="bg-white rounded-xl border border-zinc-100 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">What Weekly Review will do</h2>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
          FounderOS will synthesise your week across every project — completed work, stuck
          momentum, open risks, and ideas worth revisiting — then help you set priorities for
          the week ahead. One AI-powered ritual to keep your operating system aligned.
        </p>
        <ul className="grid sm:grid-cols-2 gap-2 text-xs text-zinc-500">
          {[
            'Summarise completed tasks and wins',
            'Flag projects that lost momentum',
            'Surface high-priority work for next week',
            'Review ideas explored or validated',
          ].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-zinc-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {stats.hasData ? (
        <>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Preview — your data today
              </h2>
              <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-0.5">
                Dashboard <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PreviewCard
                title="Completed tasks"
                count={stats.completedTasks}
                desc="Tasks marked done — Weekly Review will highlight wins and patterns."
                icon={CheckCircle2}
                accent="bg-emerald-50 text-emerald-600"
              />
              <PreviewCard
                title="Stuck projects"
                count={stats.stuckProjects}
                desc="Projects with low progress or no recent updates."
                icon={AlertOctagon}
                accent="bg-orange-50 text-orange-600"
              />
              <PreviewCard
                title="Upcoming priorities"
                count={stats.upcomingPriorities}
                desc="High-priority open tasks to carry into next week."
                icon={Target}
                accent="bg-blue-50 text-blue-600"
              />
              <PreviewCard
                title="Ideas reviewed"
                count={stats.ideasReviewed}
                desc="Ideas explored, validated, or turned into projects."
                icon={Lightbulb}
                accent="bg-violet-50 text-violet-600"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-100">
          <EmptyState
            icon={CalendarCheck2}
            title="Nothing to review yet"
            description="Add projects, tasks, and ideas — Weekly Review will synthesise them into a clear picture of your week."
            action={{ label: 'Go to Dashboard', href: '/dashboard' }}
          />
        </div>
      )}

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-zinc-400 bg-zinc-100 border border-zinc-200 rounded-lg cursor-not-allowed"
        >
          <CalendarCheck2 size={15} />
          Coming soon
        </button>
        <p className="text-xs text-zinc-400">Full AI weekly review is on the roadmap.</p>
      </div>
    </div>
  )
}
