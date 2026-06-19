'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppContext } from '@/contexts/AppContext'
import { ProjectProvider } from '@/contexts/ProjectContext'
import ProjectTabs from '@/components/project/ProjectTabs'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>()
  const id     = params?.id ?? ''
  const router = useRouter()

  const { appState, isHydrated, loadError } = useAppContext()
  const project = appState.projects.find(p => p.id === id)

  // Redirect to the project list if the project doesn't exist (after load).
  useEffect(() => {
    if (isHydrated && !loadError && !project) router.replace('/projects')
  }, [isHydrated, loadError, project, router])

  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading project…" /></div>
  if (loadError)   return <div className="p-6"><ErrorScreen message={loadError} /></div>
  if (!project)    return <div className="p-6"><LoadingScreen label="Redirecting…" /></div>

  return (
    <ProjectProvider project={project}>
      <div className="flex flex-col min-h-full">
        {/* Project header */}
        <div className="bg-white border-b border-zinc-200 px-6 pt-5 pb-4">
          <p className="text-xs text-zinc-400 mb-1">Project</p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base font-semibold text-zinc-900">{project.title}</h1>
            <StatusBadge status={project.status} size="md" />
            <StatusBadge status={project.priority} size="md" />
          </div>
          {project.goal && (
            <p className="mt-1.5 text-sm text-zinc-500 max-w-2xl leading-relaxed line-clamp-2">{project.goal}</p>
          )}
          {project.progress > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <div className="w-40 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    project.progress >= 100 ? 'bg-emerald-500' :
                    project.progress >= 60  ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400">{project.progress}%</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <ProjectTabs projectId={id} />

        {/* Page content */}
        <div className="flex-1 bg-zinc-50">
          {children}
        </div>
      </div>
    </ProjectProvider>
  )
}
