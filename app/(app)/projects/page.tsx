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
          title="No worlds yet"
          description="Worlds are structured AI environments with memory, tasks, decisions, risks, reviews and semantic search."
          action={{ label: 'Create your first world', onClick: () => setShowCreate(true) }}
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
          <h1 className="text-xl font-semibold text-zinc-900">Worlds</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Living AI environments for projects, learning, health, business and life areas.
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
