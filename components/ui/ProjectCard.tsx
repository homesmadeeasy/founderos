import Link from 'next/link'
import { CheckSquare, MessageSquare, Sparkles, AlertTriangle } from 'lucide-react'
import StatusBadge from './StatusBadge'
import type { Project } from '@/lib/types'

interface Props {
  project: Project
  openTasks: number
  openRisks: number
}

export default function ProjectCard({ project, openTasks, openRisks }: Props) {
  const preview = project.description || project.goal
  const progress = Math.min(100, Math.max(0, project.progress))

  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-5 hover:border-zinc-300 hover:shadow-sm transition-all flex flex-col gap-3">
      <Link href={`/projects/${project.id}`} className="group block space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700 leading-snug line-clamp-2">
            {project.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <StatusBadge status={project.priority} />
            <StatusBadge status={project.status} />
          </div>
        </div>

        {preview ? (
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{preview}</p>
        ) : (
          <p className="text-xs text-zinc-400 italic">No description yet</p>
        )}

        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress >= 100 ? 'bg-emerald-500' :
                progress >= 60  ? 'bg-blue-500' : 'bg-zinc-700'
              }`}
              style={{ width: `${progress || 0}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400 pt-0.5">
          <span className="flex items-center gap-1">
            <CheckSquare size={11} /> {openTasks} open task{openTasks === 1 ? '' : 's'}
          </span>
          {openRisks > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertTriangle size={11} /> {openRisks} risk{openRisks === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <p className="text-[11px] text-zinc-400">
          Updated {new Date(project.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </Link>

      <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100">
        <QuickAction href={`/projects/${project.id}`} label="Open" />
        <QuickAction href={`/projects/${project.id}/chat`} label="Chat" icon={MessageSquare} />
        <QuickAction href={`/projects/${project.id}/review`} label="Review" icon={Sparkles} />
      </div>
    </div>
  )
}

function QuickAction({
  href, label, icon: Icon,
}: {
  href: string
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
    >
      {Icon && <Icon size={10} />}
      {label}
    </Link>
  )
}
