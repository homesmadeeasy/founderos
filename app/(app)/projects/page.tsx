'use client'

import Link from 'next/link'
import { useAppContext } from '@/contexts/AppContext'
import StatusBadge from '@/components/ui/StatusBadge'
import CreateProjectModal from '@/components/ui/CreateProjectModal'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'

export default function ProjectsPage() {
  const { appState, isHydrated, loadError } = useAppContext()
  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading your projects…" /></div>
  if (loadError)   return <div className="p-6"><ErrorScreen message={loadError} /></div>

  const { projects, tasks } = appState

  const activeProjects   = projects.filter(p => !['archived'].includes(p.status))
  const archivedProjects = projects.filter(p => p.status === 'archived')

  function ProjectCard({ project }: { project: typeof projects[0] }) {
    const projectTasks  = tasks.filter(t => t.projectId === project.id)
    const done          = projectTasks.filter(t => t.status === 'done').length
    const inProgress    = projectTasks.filter(t => t.status === 'in_progress').length

    return (
      <Link
        href={`/projects/${project.id}`}
        className="group bg-white rounded-xl border border-zinc-100 p-5 hover:border-zinc-300 hover:shadow-sm transition-all flex flex-col gap-3"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700 leading-snug">{project.title}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={project.priority} />
            <StatusBadge status={project.status} />
          </div>
        </div>

        {/* Goal */}
        {project.goal && (
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{project.goal}</p>
        )}

        {/* Progress bar */}
        {project.progress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
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

        {/* Task stats */}
        {projectTasks.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span>{projectTasks.length} tasks</span>
            {inProgress > 0 && <span className="text-blue-500">{inProgress} in progress</span>}
            {done > 0 && <span className="text-emerald-500">{done} done</span>}
          </div>
        )}
      </Link>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Projects</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{activeProjects.length} active · {archivedProjects.length} archived</p>
        </div>
        <CreateProjectModal />
      </div>

      {/* Active projects */}
      {activeProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProjects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-100 py-16 text-center">
          <p className="text-sm font-semibold text-zinc-800 mb-1">No projects yet</p>
          <p className="text-xs text-zinc-400 mb-4">Create your first project to get started.</p>
          <CreateProjectModal />
        </div>
      )}

      {/* Archived */}
      {archivedProjects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Archived</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedProjects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
