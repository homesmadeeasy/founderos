import Link from 'next/link'
import {
  getProject, getTasksForProject, getNotesForProject,
  getDecisionsForProject, getRisksForProject, getRoadmapForProject,
} from '@/lib/mock-data'
import DashboardCard from '@/components/ui/DashboardCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { CheckSquare, StickyNote, GitBranch, AlertTriangle, MessageSquare, Map, ArrowRight } from 'lucide-react'

const subpages = [
  { label: 'Chat',      slug: 'chat',      icon: MessageSquare, desc: 'Talk to AI about this project' },
  { label: 'Tasks',     slug: 'tasks',     icon: CheckSquare,   desc: 'Track what needs to get done' },
  { label: 'Notes',     slug: 'notes',     icon: StickyNote,    desc: 'Capture ideas and context' },
  { label: 'Decisions', slug: 'decisions', icon: GitBranch,     desc: 'Log key choices and reasoning' },
  { label: 'Risks',     slug: 'risks',     icon: AlertTriangle, desc: 'Identify and mitigate risks' },
  { label: 'Roadmap',   slug: 'roadmap',   icon: Map,           desc: 'Phases and milestones' },
]

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }       = await params
  const project      = getProject(id)!
  const allTasks     = getTasksForProject(id)
  const allNotes     = getNotesForProject(id)
  const allDecisions = getDecisionsForProject(id)
  const allRisks     = getRisksForProject(id)
  const allRoadmap   = getRoadmapForProject(id)

  const openTasks  = allTasks.filter((t) => t.status !== 'done')
  const doneTasks  = allTasks.filter((t) => t.status === 'done')
  const inProgress = allTasks.filter((t) => t.status === 'in_progress')
  const openRisks  = allRisks.filter((r) => r.status === 'open')

  // Progress: % of tasks marked done
  const progress = allTasks.length > 0
    ? Math.round((doneTasks.length / allTasks.length) * 100)
    : 0

  const stats = [
    { label: 'Open Tasks',  value: openTasks.length,   icon: CheckSquare,   href: `${id}/tasks` },
    { label: 'Notes',       value: allNotes.length,    icon: StickyNote,    href: `${id}/notes` },
    { label: 'Decisions',   value: allDecisions.length,icon: GitBranch,     href: `${id}/decisions` },
    { label: 'Open Risks',  value: openRisks.length,   icon: AlertTriangle, href: `${id}/risks` },
  ]

  return (
    <div className="space-y-6">

      {/* Progress bar */}
      {allTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700">Overall progress</span>
            <span className="font-semibold text-zinc-900">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-2 bg-zinc-900 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400">
            {doneTasks.length} of {allTasks.length} tasks complete · {inProgress.length} in progress
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <DashboardCard key={s.label} {...s} />
        ))}
      </div>

      {/* Description + Goal */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Description</p>
          <p className="text-sm text-zinc-700 leading-relaxed">{project.description}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">V1 Goal</p>
          <p className="text-sm text-zinc-700 leading-relaxed">{project.goal}</p>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-600 mb-3">Quick links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {subpages.map(({ label, slug, icon: Icon, desc }) => (
            <Link
              key={slug}
              href={`/projects/${id}/${slug}`}
              className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-zinc-300 transition-colors group flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-zinc-200 transition-colors">
                <Icon size={14} className="text-zinc-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-800">{label}</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* In-progress tasks */}
      {inProgress.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">In progress</h2>
            <Link href={`/projects/${id}/tasks`} className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition-colors">
              All tasks <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {inProgress.map((task) => (
              <div key={task.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-sm text-zinc-700 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={task.status} />
                  <StatusBadge status={task.priority} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent roadmap */}
      {allRoadmap.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">Roadmap snapshot</h2>
            <Link href={`/projects/${id}/roadmap`} className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition-colors">
              Full roadmap <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {allRoadmap.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {item.stage && (
                    <span className="shrink-0 text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                      {item.stage}
                    </span>
                  )}
                  <span className="text-sm text-zinc-700 truncate">{item.title}</span>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
