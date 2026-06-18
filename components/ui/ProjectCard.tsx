import Link from 'next/link'
import { CheckSquare, MessageSquare } from 'lucide-react'
import StatusBadge from './StatusBadge'
import type { Project } from '@/lib/types'

interface Props {
  project: Project
  openTasks?: number
  messageCount?: number
}

export default function ProjectCard({ project, openTasks = 0, messageCount = 0 }: Props) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col gap-4 hover:border-zinc-300 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors leading-snug">
          {project.title}
        </h2>
        <StatusBadge status={project.status} />
      </div>

      <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 -mt-2">
        {project.description}
      </p>

      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <CheckSquare size={11} />
            {openTasks} open task{openTasks !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={11} />
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </span>
        </div>
        <span>
          {new Date(project.updatedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </div>
    </Link>
  )
}
