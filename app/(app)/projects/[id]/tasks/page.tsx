'use client'

import Link from 'next/link'
import { useProjectContext } from '@/contexts/ProjectContext'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { Plus, Calendar, CheckSquare } from 'lucide-react'
import type { Task } from '@/lib/types'

const columns: { key: Task['status']; label: string; dot: string }[] = [
  { key: 'todo',        label: 'To Do',       dot: 'bg-zinc-300' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-blue-400' },
  { key: 'done',        label: 'Done',        dot: 'bg-emerald-400' },
]

export default function ProjectTasksPage() {
  const { project, tasks } = useProjectContext()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        description="Track what needs to get done."
        action={
          <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            <Plus size={13} /> Add Task
          </button>
        }
      />

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 gap-3 text-center">
          <CheckSquare size={22} className="text-zinc-300" />
          <div>
            <p className="text-sm font-medium text-zinc-700">No tasks yet</p>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Use the{' '}
              <Link href={`/projects/${project.id}/chat`} className="text-zinc-600 underline underline-offset-2">Chat tab</Link>
              {' '}to ask AI for a task breakdown, then click <strong>Task</strong> under any message to save it here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-5">
          {columns.map(({ key, label, dot }) => {
            const col = tasks.filter((t) => t.status === key)
            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</h3>
                  <span className="ml-auto text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((task) => (
                    <div key={task.id} className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2.5 hover:border-zinc-300 transition-colors">
                      <p className="text-sm font-medium text-zinc-800 leading-snug">{task.title}</p>
                      {task.description && <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{task.description}</p>}
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={task.priority} />
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-zinc-400">
                            <Calendar size={11} />
                            {new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {col.length === 0 && (
                    <div className="bg-white rounded-xl border border-dashed border-zinc-200 p-6 text-center">
                      <p className="text-xs text-zinc-400">Nothing here yet</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
