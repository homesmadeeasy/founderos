'use client'

import { useMemo, useState } from 'react'
import { CheckSquare, Plus, Trash2 } from 'lucide-react'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import {
  LIFE_AREAS, LIFE_AREA_LABEL, TASK_PRIORITIES, TASK_STATUSES,
} from '@/lib/command-center/types'
import { isDueToday, todayISO } from '@/lib/command-center/utils'
import type { LifeArea, TaskPriority, TaskStatus } from '@/lib/command-center/types'
import CardShell from './CardShell'

export default function TodayPrioritiesCard() {
  const { state, addTask, updateTask, deleteTask } = useCommandCenter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [area, setArea] = useState<LifeArea>('systems')

  const today = todayISO()
  const priorities = useMemo(() => {
    const open = state.tasks.filter(t => t.status !== 'done')
    return open
      .filter(t => isDueToday(t.dueDate, today) || t.priority === 'high')
      .sort((a, b) => {
        const rank = { high: 0, medium: 1, low: 2 }
        return rank[a.priority] - rank[b.priority]
      })
  }, [state.tasks, today])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    addTask({
      title: title.trim(),
      status: 'not_started',
      priority,
      area,
      dueDate: today,
      projectId: null,
    })
    setTitle('')
    setShowForm(false)
  }

  function cyclePriority(id: string, current: TaskPriority) {
    const idx = TASK_PRIORITIES.indexOf(current)
    const next = TASK_PRIORITIES[(idx + 1) % TASK_PRIORITIES.length]
    updateTask(id, { priority: next })
  }

  function cycleStatus(id: string, current: TaskStatus) {
    const idx = TASK_STATUSES.indexOf(current)
    const next = TASK_STATUSES[(idx + 1) % TASK_STATUSES.length]
    updateTask(id, { status: next })
  }

  return (
    <CardShell
      title="Today's Priorities"
      icon={CheckSquare}
      action={
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      }
    >
      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            autoFocus
          />
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as TaskPriority)}
              className="flex-1 rounded-lg border border-zinc-200 px-2 py-2 text-xs"
            >
              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={area}
              onChange={e => setArea(e.target.value as LifeArea)}
              className="flex-1 rounded-lg border border-zinc-200 px-2 py-2 text-xs"
            >
              {LIFE_AREAS.map(a => <option key={a} value={a}>{LIFE_AREA_LABEL[a]}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold">
            Add task
          </button>
        </form>
      )}

      {priorities.length === 0 ? (
        <p className="text-sm text-zinc-400">No priorities yet. Add a high-priority or due-today task.</p>
      ) : (
        <ul className="space-y-2">
          {priorities.map(task => {
            const project = state.projects.find(p => p.id === task.projectId)
            return (
              <li
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors group"
              >
                <button
                  type="button"
                  onClick={() => cycleStatus(task.id, task.status)}
                  className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] ${
                    task.status === 'done'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : task.status === 'in_progress'
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-zinc-300'
                  }`}
                  title="Cycle status"
                >
                  {task.status === 'done' ? '✓' : ''}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                    {task.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {LIFE_AREA_LABEL[task.area]}
                    {project ? ` · ${project.name}` : ''}
                    {' · '}
                    <button type="button" onClick={() => cyclePriority(task.id, task.priority)} className="hover:text-zinc-600">
                      {task.priority} priority
                    </button>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                  aria-label="Delete task"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </CardShell>
  )
}
