'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Trash2, RotateCcw } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import LinkButton from '@/components/memory/LinkButton'
import type { Task, TaskStatus } from '@/lib/types'

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '→ Start',
  in_progress: '→ Done',
  done: '↩ Reopen',
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export default function TasksPage() {
  const { project, tasks } = useProjectContext()
  const { updateTask, deleteTask } = useAppContext()
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)

  const cycleStatus = (task: Task) =>
    void updateTask(task.id, { status: STATUS_CYCLE[task.status] }).catch(() => {})

  const groups: { label: string; status: TaskStatus; items: Task[] }[] = [
    { label: 'In Progress', status: 'in_progress', items: tasks.filter(t => t.status === 'in_progress').sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) },
    { label: 'To Do',       status: 'todo',        items: tasks.filter(t => t.status === 'todo').sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) },
    { label: 'Done',        status: 'done',        items: tasks.filter(t => t.status === 'done') },
  ]

  if (tasks.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-zinc-100 py-20 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
            <MessageSquare size={20} className="text-zinc-300" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">No tasks yet</p>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">Tasks can be created manually or converted directly from AI chat responses.</p>
          <Link href={`/projects/${project.id}/chat`} className="mt-2 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
            <MessageSquare size={12} /> Open chat
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Tasks <span className="text-zinc-400 font-normal">({tasks.length})</span></h2>
        <Link href={`/projects/${project.id}/chat`} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
          <MessageSquare size={11} /> Add via chat
        </Link>
      </div>

      {groups.map(({ label, status, items }) => items.length > 0 && (
        <div key={status} className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-zinc-500">{label}</h3>
            <span className="text-xs text-zinc-300">({items.length})</span>
          </div>
          <div className="space-y-2">
            {items.map(task => (
              <div key={task.id} className={`bg-white rounded-xl border px-4 py-3.5 flex items-center gap-3 group transition-colors ${task.status === 'done' ? 'border-zinc-100 opacity-60' : 'border-zinc-100 hover:border-zinc-200'}`}>
                {/* Status toggle */}
                <button
                  onClick={() => cycleStatus(task)}
                  title={`Mark as ${STATUS_CYCLE[task.status]}`}
                  className={`w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${
                    task.status === 'done'        ? 'bg-emerald-500 border-emerald-500' :
                    task.status === 'in_progress' ? 'border-blue-400 bg-blue-50'       : 'border-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  {task.status === 'done' && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {task.status === 'in_progress' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-zinc-800 ${task.status === 'done' ? 'line-through text-zinc-400' : ''}`}>{task.title}</p>
                  {task.description && <p className="text-xs text-zinc-400 mt-0.5 truncate">{task.description}</p>}
                  {task.dueDate && <p className="text-xs text-zinc-400 mt-0.5">Due {task.dueDate}</p>}
                </div>

                {/* Priority + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={task.priority} />
                  <button
                    onClick={() => cycleStatus(task)}
                    className="hidden group-hover:flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1 rounded-md hover:bg-zinc-50 transition-colors"
                  >
                    <RotateCcw size={10} /> {STATUS_LABEL[task.status]}
                  </button>
                  <div className="hidden group-hover:flex">
                    <LinkButton type="task" id={task.id} label={task.title} />
                  </div>
                  <button
                    onClick={() => setPendingDelete(task)}
                    className="hidden group-hover:flex items-center justify-center w-6 h-6 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete task"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this task?"
        description={pendingDelete ? `“${pendingDelete.title}” will be permanently removed.` : ''}
        confirmLabel="Delete task"
        onConfirm={async () => { if (pendingDelete) { await deleteTask(pendingDelete.id); setPendingDelete(null) } }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
