'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, CheckSquare, FileText, GitFork, AlertTriangle, Map, Pencil, Trash2 } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import EditProjectModal from '@/components/project/EditProjectModal'
import StatusBadge from '@/components/ui/StatusBadge'

export default function ProjectOverviewPage() {
  const router = useRouter()
  const { project, tasks, notes, decisions, risks, roadmapItems } = useProjectContext()
  const { deleteProject } = useAppContext()
  const [showEdit,    setShowEdit]    = useState(false)
  const [showDelete,  setShowDelete]  = useState(false)

  const doneTasks       = tasks.filter(t => t.status === 'done').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const openRisks       = risks.filter(r => r.status === 'open').length

  async function handleDelete() {
    await deleteProject(project.id)
    router.replace('/projects')
  }

  const sections = [
    { icon: MessageSquare, label: 'Chat',      href: 'chat',      stat: null,                 color: 'text-blue-500',    bg: 'bg-blue-50' },
    { icon: CheckSquare,   label: 'Tasks',     href: 'tasks',     stat: `${tasks.length} total · ${doneTasks} done`,         color: 'text-orange-500',  bg: 'bg-orange-50' },
    { icon: FileText,      label: 'Notes',     href: 'notes',     stat: `${notes.length} notes`,                              color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: GitFork,       label: 'Decisions', href: 'decisions', stat: `${decisions.length} logged`,                         color: 'text-purple-500',  bg: 'bg-purple-50' },
    { icon: AlertTriangle, label: 'Risks',     href: 'risks',     stat: `${openRisks} open`,                                  color: 'text-red-500',     bg: 'bg-red-50' },
    { icon: Map,           label: 'Roadmap',   href: 'roadmap',   stat: `${roadmapItems.length} items`,                       color: 'text-indigo-500',  bg: 'bg-indigo-50' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/projects" className="hover:text-zinc-700 transition-colors">Projects</Link>
        <span>/</span>
        <span className="text-zinc-600">{project.title}</span>
      </div>

      {/* Header + actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-900">{project.title}</h1>
          </div>
          {project.description && (
            <p className="text-sm text-zinc-600 max-w-2xl leading-relaxed">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 bg-white border border-zinc-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="font-medium text-zinc-400">Status</span>
          <StatusBadge status={project.status} size="md" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="font-medium text-zinc-400">Priority</span>
          <StatusBadge status={project.priority} size="md" />
        </div>
        {inProgressTasks > 0 && (
          <span className="text-xs text-blue-600 font-medium">{inProgressTasks} task{inProgressTasks > 1 ? 's' : ''} in progress</span>
        )}
      </div>

      {/* Goal */}
      {project.goal && (
        <div className="bg-white rounded-xl border border-zinc-100 p-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">V1 Goal</p>
          <p className="text-sm text-zinc-700 leading-relaxed">{project.goal}</p>
        </div>
      )}

      {/* Progress */}
      {project.progress > 0 && (
        <div className="bg-white rounded-xl border border-zinc-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Progress</p>
            <p className="text-sm font-bold text-zinc-800">{project.progress}%</p>
          </div>
          <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                project.progress >= 100 ? 'bg-emerald-500' :
                project.progress >= 60  ? 'bg-blue-500' : 'bg-zinc-700'
              }`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sections.map(s => (
          <Link
            key={s.href}
            href={`/projects/${project.id}/${s.href}`}
            className="bg-white rounded-xl border border-zinc-100 p-4 hover:border-zinc-300 hover:shadow-sm transition-all flex items-center gap-3 group"
          >
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon size={15} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900">{s.label}</p>
              {s.stat && <p className="text-xs text-zinc-400 truncate">{s.stat}</p>}
            </div>
          </Link>
        ))}
      </div>

      {/* Edit modal */}
      {showEdit && <EditProjectModal project={project} onClose={() => setShowEdit(false)} />}

      {/* Delete confirmation */}
      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowDelete(false) }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-zinc-900">Delete &ldquo;{project.title}&rdquo;?</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                This will permanently remove the project and all its tasks, notes, decisions, risks and roadmap items. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 justify-end pt-1">
              <button onClick={() => setShowDelete(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
