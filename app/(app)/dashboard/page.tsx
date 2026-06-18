import Link from 'next/link'
import { FolderKanban, CheckSquare, StickyNote, GitBranch, ArrowRight } from 'lucide-react'
import { projects, tasks, notes, decisions, chatMessages } from '@/lib/mock-data'
import DashboardCard from '@/components/ui/DashboardCard'
import ProjectCard from '@/components/ui/ProjectCard'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import CreateProjectModal from '@/components/ui/CreateProjectModal'

export default function DashboardPage() {
  const openTasks = tasks.filter((t) => t.status !== 'done')

  const stats = [
    {
      label: 'Active Projects',
      value: projects.filter((p) => p.status === 'active').length,
      icon: FolderKanban,
      href: '/projects',
    },
    {
      label: 'Open Tasks',
      value: openTasks.length,
      icon: CheckSquare,
      href: '/projects',
    },
    {
      label: 'Notes',
      value: notes.length,
      icon: StickyNote,
      href: '/projects',
    },
    {
      label: 'Decisions Made',
      value: decisions.length,
      icon: GitBranch,
      href: '/projects',
    },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="Good morning 👋"
        description="Here's where things stand across your projects."
        action={<CreateProjectModal />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-700">Your projects</h2>
          <Link href="/projects" className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition-colors">
            View all <ArrowRight size={11} />
          </Link>
        </div>
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

      {/* Open tasks list */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">Open tasks</h2>
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {openTasks.slice(0, 7).map((task) => {
            const project = projects.find((p) => p.id === task.projectId)
            return (
              <div key={task.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                  <span className="text-sm text-zinc-700 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <StatusBadge status={task.priority} />
                  <span className="text-xs text-zinc-400">{project?.title}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
