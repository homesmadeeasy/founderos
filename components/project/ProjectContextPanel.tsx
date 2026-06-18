'use client'

import Link from 'next/link'
import { CheckSquare, StickyNote, GitBranch, AlertTriangle, Map } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import StatusBadge from '@/components/ui/StatusBadge'

export default function ProjectContextPanel() {
  const { project, tasks, notes, decisions, risks, roadmapItems } = useProjectContext()

  const doneTasks  = tasks.filter((t) => t.status === 'done').length
  const openTasks  = tasks.filter((t) => t.status !== 'done').length
  const progress   = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0
  const openRisks  = risks.filter((r) => r.status === 'open').length

  const stats = [
    { label: 'Open tasks',  value: openTasks,        icon: CheckSquare,   href: `/projects/${project.id}/tasks` },
    { label: 'Notes',       value: notes.length,     icon: StickyNote,    href: `/projects/${project.id}/notes` },
    { label: 'Decisions',   value: decisions.length, icon: GitBranch,     href: `/projects/${project.id}/decisions` },
    { label: 'Open risks',  value: openRisks,        icon: AlertTriangle, href: `/projects/${project.id}/risks` },
    { label: 'Milestones',  value: roadmapItems.length, icon: Map,        href: `/projects/${project.id}/roadmap` },
  ]

  return (
    <aside className="w-64 shrink-0 flex flex-col gap-4">

      {/* Project info */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Project</p>
          <p className="text-sm font-semibold text-zinc-900 leading-snug">{project.title}</p>
          <StatusBadge status={project.status} />
        </div>

        {project.goal && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Goal</p>
            <p className="text-xs text-zinc-500 leading-relaxed line-clamp-4">{project.goal}</p>
          </div>
        )}

        {/* Progress */}
        {tasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-400 uppercase tracking-wide">Progress</span>
              <span className="font-semibold text-zinc-700">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-1.5 bg-zinc-900 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400">{doneTasks} of {tasks.length} tasks done</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-0.5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Quick links</p>
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-50 transition-colors group"
          >
            <div className="flex items-center gap-2 text-xs text-zinc-500 group-hover:text-zinc-700">
              <Icon size={12} />
              {label}
            </div>
            <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded-full">
              {value}
            </span>
          </Link>
        ))}
      </div>

      {/* Tip */}
      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="font-semibold text-zinc-700">Tip:</span> Click the buttons under any AI message to save it as a task, note, decision, risk, or roadmap item.
        </p>
      </div>
    </aside>
  )
}
