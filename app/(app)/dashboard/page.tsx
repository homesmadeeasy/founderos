'use client'

import Link from 'next/link'
import { useAppContext } from '@/contexts/AppContext'
import StatusBadge from '@/components/ui/StatusBadge'
import CreateProjectModal from '@/components/ui/CreateProjectModal'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'

export default function DashboardPage() {
  const { appState, isHydrated, loadError } = useAppContext()
  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading your dashboard…" /></div>
  if (loadError)   return <div className="p-6"><ErrorScreen message={loadError} /></div>

  const { projects, tasks, decisions, risks, ideas } = appState

  const activeProjects = projects.filter(p => !['archived', 'paused'].includes(p.status))
  const openTasks      = tasks.filter(t => t.status !== 'done')
  const openRisks      = risks.filter(r => r.status === 'open')
  const openDecisions  = decisions.length

  const rawIdeas       = ideas.filter(i => i.status === 'Raw').length
  const exploringIdeas = ideas.filter(i => i.status === 'Exploring').length
  const turnedIdeas    = ideas.filter(i => i.status === 'Turned Into Project').length
  const recentIdeas    = [...ideas]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4)

  const nextTasks = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 }
      return priority[a.priority] - priority[b.priority]
    })
    .slice(0, 4)

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your FounderOS overview.</p>
        </div>
        <CreateProjectModal />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active projects',  value: activeProjects.length,  color: 'text-blue-600' },
          { label: 'Open tasks',       value: openTasks.length,       color: 'text-orange-600' },
          { label: 'Decisions logged', value: openDecisions,          color: 'text-emerald-600' },
          { label: 'Open risks',       value: openRisks.length,       color: 'text-red-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-zinc-100 p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Idea Vault */}
      <div className="bg-white rounded-xl border border-zinc-100">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Idea Vault</h2>
          <Link href="/ideas" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Open vault →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-zinc-50">
          {[
            { label: 'Total ideas',       value: ideas.length,   color: 'text-zinc-800' },
            { label: 'Raw',               value: rawIdeas,       color: 'text-yellow-600' },
            { label: 'Exploring',         value: exploringIdeas, color: 'text-blue-600' },
            { label: 'Turned into projects', value: turnedIdeas, color: 'text-emerald-600' },
          ].map(stat => (
            <div key={stat.label} className="px-5 py-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
        {recentIdeas.length > 0 && (
          <div className="divide-y divide-zinc-50 border-t border-zinc-100">
            {recentIdeas.map(idea => (
              <Link key={idea.id} href={`/ideas/${idea.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors group">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900 truncate">{idea.title}</span>
                  {idea.description && <span className="text-xs text-zinc-400 truncate">{idea.description}</span>}
                </div>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  <span className="text-xs text-emerald-600">{idea.potentialScore}/10</span>
                  <StatusBadge status={idea.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent projects */}
        <div className="bg-white rounded-xl border border-zinc-100">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Recent projects</h2>
            <Link href="/projects" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">View all →</Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {recentProjects.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-zinc-400">No projects yet.</div>
            ) : recentProjects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors group">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900 truncate">{p.title}</span>
                  {p.goal && <span className="text-xs text-zinc-400 truncate">{p.goal}</span>}
                </div>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  {p.progress > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-700 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs text-zinc-400">{p.progress}%</span>
                    </div>
                  )}
                  <StatusBadge status={p.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Next tasks */}
        <div className="bg-white rounded-xl border border-zinc-100">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Next tasks to work on</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {nextTasks.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-zinc-400">All caught up — no open tasks.</div>
            ) : nextTasks.map(t => {
              const project = projects.find(p => p.id === t.projectId)
              return (
                <Link key={t.id} href={`/projects/${t.projectId}/tasks`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors group">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${t.priority === 'high' ? 'bg-orange-400' : t.priority === 'medium' ? 'bg-yellow-400' : 'bg-zinc-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 group-hover:text-zinc-900 truncate">{t.title}</p>
                    {project && <p className="text-xs text-zinc-400">{project.title}</p>}
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* All projects quick view */}
      {projects.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-100">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">All projects</h2>
            <span className="text-xs text-zinc-400">{projects.length} total</span>
          </div>
          <div className="divide-y divide-zinc-50">
            {projects.map(p => {
              const projectTasks = tasks.filter(t => t.projectId === p.id)
              const doneTasks    = projectTasks.filter(t => t.status === 'done').length
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900 truncate">{p.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{projectTasks.length} tasks · {doneTasks} done</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={p.priority} />
                    <StatusBadge status={p.status} />
                    {p.progress > 0 && (
                      <span className="text-xs text-zinc-500 font-medium w-8 text-right">{p.progress}%</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
