import { projects, tasks, chatMessages } from '@/lib/mock-data'
import ProjectCard from '@/components/ui/ProjectCard'
import PageHeader from '@/components/ui/PageHeader'
import CreateProjectModal from '@/components/ui/CreateProjectModal'

export default function ProjectsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Projects"
        description="All your ongoing work in one place."
        action={<CreateProjectModal />}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const open = tasks.filter((t) => t.projectId === project.id && t.status !== 'done').length
          const msgs = (chatMessages[project.id] ?? []).length
          return (
            <ProjectCard key={project.id} project={project} openTasks={open} messageCount={msgs} />
          )
        })}
      </div>
    </div>
  )
}
