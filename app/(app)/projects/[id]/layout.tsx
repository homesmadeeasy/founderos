import { notFound } from 'next/navigation'
import ProjectTabs from '@/components/project/ProjectTabs'
import StatusBadge from '@/components/ui/StatusBadge'
import { ProjectProvider } from '@/contexts/ProjectContext'
import {
  getProject, getTasksForProject, getNotesForProject,
  getDecisionsForProject, getRisksForProject, getRoadmapForProject,
  getChatMessages,
} from '@/lib/mock-data'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = getProject(id)
  if (!project) notFound()

  // Load all initial data server-side, pass to client provider
  const initialData = {
    project,
    tasks:        getTasksForProject(id),
    notes:        getNotesForProject(id),
    decisions:    getDecisionsForProject(id),
    risks:        getRisksForProject(id),
    roadmapItems: getRoadmapForProject(id),
    messages:     getChatMessages(id),
  }

  return (
    <ProjectProvider initialData={initialData}>
      <div className="flex flex-col min-h-full">
        {/* Project header */}
        <div className="bg-white border-b border-zinc-200 px-6 pt-6 pb-4">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs text-zinc-400 mb-1">Project</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-semibold text-zinc-900">{project.title}</h1>
              <StatusBadge status={project.status} size="md" />
            </div>
            {project.goal && (
              <p className="mt-1.5 text-sm text-zinc-500 max-w-2xl leading-relaxed">{project.goal}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <ProjectTabs projectId={id} />

        {/* Content */}
        <div className="flex-1 bg-zinc-50 p-6">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </ProjectProvider>
  )
}
