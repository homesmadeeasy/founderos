'use client'

import { useState } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import ProjectCard from '@/components/ui/ProjectCard'
import CreateProjectModal from '@/components/ui/CreateProjectModal'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'
import EmptyState from '@/components/ui/EmptyState'
import { FolderKanban } from 'lucide-react'

function ProjectsEmptyState() {
  const [showCreate, setShowCreate] = useState(false)
  return (
    <>
      <div className="bg-white rounded-xl border border-zinc-100">
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Projects are where your ideas become execution systems with AI chat, tasks, decisions, risks, files and reviews."
          action={{ label: 'Create your first project', onClick: () => setShowCreate(true) }}
        />
      </div>
      {showCreate && (
        <CreateProjectModal
          open={showCreate}
          onOpenChange={setShowCreate}
          hideTrigger
        />
      )}
    </>
  )
}

export default function ProjectsPage() {
  const { appState, isHydrated, loadError } = useAppContext()
  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading your projects…" /></div>
  if (loadError)   return <div className="p-6"><ErrorScreen message={loadError} /></div>

  const { projects, tasks, risks } = appState

  const activeProjects   = projects.filter(p => p.status !== 'archived')
  const archivedProjects = projects.filter(p => p.status === 'archived')

  function counts(projectId: string) {
    return {
      openTasks: tasks.filter(t => t.projectId === projectId && t.status !== 'done').length,
      openRisks: risks.filter(r => r.projectId === projectId && r.status === 'open').length,
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Projects</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activeProjects.length} active · {archivedProjects.length} archived
          </p>
        </div>
        <CreateProjectModal />
      </div>

      {activeProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProjects.map(p => {
            const { openTasks, openRisks } = counts(p.id)
            return (
              <ProjectCard
                key={p.id}
                project={p}
                openTasks={openTasks}
                openRisks={openRisks}
              />
            )
          })}
        </div>
      ) : (
        <ProjectsEmptyState />
      )}

      {archivedProjects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Archived</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedProjects.map(p => {
              const { openTasks, openRisks } = counts(p.id)
              return (
                <ProjectCard key={p.id} project={p} openTasks={openTasks} openRisks={openRisks} />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
