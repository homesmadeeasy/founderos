'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, CheckSquare, FileText, GitFork, AlertTriangle, Map, Pencil, Trash2, ArrowRight, Sparkles, Network, File, Dna } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import EditProjectModal from '@/components/project/EditProjectModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import StatusBadge from '@/components/ui/StatusBadge'
import { collectProjectEntityIds, getProjectLinks, buildLabelResolver, describeLink } from '@/lib/links'
import type { TaskPriority } from '@/lib/types'

const TASK_PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

export default function ProjectOverviewPage() {
  const router = useRouter()
  const { project, tasks, notes, decisions, risks, roadmapItems, messages, reviews, reviewsLoading, latestDna, dnaLoading } = useProjectContext()
  const { appState, deleteProject } = useAppContext()
  const latestReview = reviews[0]

  // Knowledge graph: recent links involving this project, in plain English.
  const { projectLinks, describe } = useMemo(() => {
    const ids = collectProjectEntityIds(appState, project.id)
    const resolve = buildLabelResolver(appState)
    return {
      projectLinks: getProjectLinks(appState.links, ids),
      describe: (l: typeof appState.links[number]) => describeLink(l, resolve),
    }
  }, [appState, project.id])
  const recentLinks = projectLinks.slice(0, 5)
  const projectFiles = appState.projectFiles
    .filter(f => f.projectId === project.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const latestFiles = projectFiles.slice(0, 3)
  const [showEdit,   setShowEdit]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const doneTasks       = tasks.filter(t => t.status === 'done').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const openRisks       = risks.filter(r => r.status === 'open').length

  // Derived previews
  const nextTasks = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => TASK_PRIORITY_RANK[a.priority] - TASK_PRIORITY_RANK[b.priority])
    .slice(0, 4)

  const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const keyRisks = risks
    .filter(r => r.status === 'open')
    .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
    .slice(0, 3)

  const recentDecisions = [...decisions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  const roadmapPreview = roadmapItems.slice(0, 4)
  const recentMessages = messages.slice(-3)

  const sections = [
    { icon: MessageSquare, label: 'Chat',      href: 'chat',      stat: `${messages.length} messages`,                color: 'text-blue-500',    bg: 'bg-blue-50' },
    { icon: CheckSquare,   label: 'Tasks',     href: 'tasks',     stat: `${tasks.length} total · ${doneTasks} done`,  color: 'text-orange-500',  bg: 'bg-orange-50' },
    { icon: FileText,      label: 'Notes',     href: 'notes',     stat: `${notes.length} notes`,                      color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: GitFork,       label: 'Decisions', href: 'decisions', stat: `${decisions.length} logged`,                 color: 'text-purple-500',  bg: 'bg-purple-50' },
    { icon: AlertTriangle, label: 'Risks',     href: 'risks',     stat: `${openRisks} open`,                          color: 'text-red-500',     bg: 'bg-red-50' },
    { icon: Map,           label: 'Roadmap',   href: 'roadmap',   stat: `${roadmapItems.length} items`,               color: 'text-indigo-500',  bg: 'bg-indigo-50' },
    { icon: Network,       label: 'Memory Graph', href: 'memory', stat: `${projectLinks.length} link${projectLinks.length === 1 ? '' : 's'}`, color: 'text-teal-500', bg: 'bg-teal-50' },
    { icon: File,          label: 'Files',        href: 'files',  stat: `${projectFiles.length} file${projectFiles.length === 1 ? '' : 's'}`, color: 'text-amber-600', bg: 'bg-amber-50' },
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
          <h1 className="text-xl font-bold text-zinc-900">{project.title}</h1>
          {project.description && (
            <p className="text-sm text-zinc-600 max-w-2xl leading-relaxed">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/projects/${project.id}/review`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <Sparkles size={12} /> Review Project
          </Link>
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

      {/* Latest Project Review */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-zinc-400" />
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Latest Project Review</p>
          </div>
          {latestReview && (
            <Link href={`/projects/${project.id}/review`} className="text-zinc-300 hover:text-zinc-600 transition-colors">
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
        {reviewsLoading ? (
          <p className="text-xs text-zinc-400 py-1">Loading…</p>
        ) : latestReview ? (
          <div className="space-y-2">
            <p className="text-[11px] text-zinc-400">{new Date(latestReview.createdAt).toLocaleString()}</p>
            <p className="text-sm text-zinc-700 leading-relaxed line-clamp-3">
              {latestReview.summary || 'Review generated.'}
            </p>
            <Link
              href={`/projects/${project.id}/review`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              View full review <ArrowRight size={12} />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400 leading-relaxed">No project review yet.</p>
            <Link
              href={`/projects/${project.id}/review`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <Sparkles size={12} /> Generate first review
            </Link>
          </div>
        )}
      </div>

      {/* Project DNA */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Dna size={13} className="text-violet-400" />
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Project DNA</p>
          </div>
          {latestDna && (
            <Link href={`/projects/${project.id}/dna`} className="text-zinc-300 hover:text-zinc-600 transition-colors">
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
        {dnaLoading ? (
          <p className="text-xs text-zinc-400 py-1">Loading…</p>
        ) : latestDna ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 rounded-full px-2 py-0.5 tabular-nums">
                {latestDna.confidenceScore}% confidence
              </span>
              <span className="text-[11px] text-zinc-400">
                {new Date(latestDna.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-zinc-700 leading-relaxed line-clamp-2">{latestDna.dnaSummary}</p>
            {latestDna.nextStrategicMove && (
              <p className="text-xs text-zinc-500 line-clamp-2">
                <span className="font-medium text-zinc-600">Next move: </span>
                {latestDna.nextStrategicMove}
              </p>
            )}
            <Link
              href={`/projects/${project.id}/dna`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              View full DNA <ArrowRight size={12} />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400 leading-relaxed">No Project DNA yet.</p>
            <Link
              href={`/projects/${project.id}/dna`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <Dna size={12} /> Generate Project DNA
            </Link>
          </div>
        )}
      </div>

      {/* Linked Memory */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Network size={13} className="text-zinc-400" />
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Linked Memory</p>
          </div>
          {projectLinks.length > 0 && (
            <Link href={`/projects/${project.id}/memory`} className="text-zinc-300 hover:text-zinc-600 transition-colors">
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
        {recentLinks.length === 0 ? (
          <p className="text-xs text-zinc-400 leading-relaxed py-1">
            No linked memory yet. As you convert AI responses, review projects, and turn ideas into projects, FounderOS will build a memory graph automatically.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentLinks.map(l => (
              <li key={l.id} className="flex items-start gap-2 text-sm text-zinc-700 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                <span>{describe(l)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Project Files */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <File size={13} className="text-zinc-400" />
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Project Files</p>
          </div>
          {projectFiles.length > 0 && (
            <Link href={`/projects/${project.id}/files`} className="text-zinc-300 hover:text-zinc-600 transition-colors">
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
        {latestFiles.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400 leading-relaxed py-1">No files uploaded yet.</p>
            <Link
              href={`/projects/${project.id}/files`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <File size={12} /> Upload first file
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {latestFiles.map(f => (
              <li key={f.id} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-800 truncate">{f.fileName}</p>
                  <p className="text-xs text-zinc-400">
                    {f.status}
                    {f.summary ? ` · ${f.summary.replace(/\s+/g, ' ').slice(0, 80)}…` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Progress */}
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
            style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
          />
        </div>
      </div>

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

      {/* Detail previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next tasks */}
        <PreviewCard title="Next tasks" icon={CheckSquare} href={`/projects/${project.id}/tasks`} empty={nextTasks.length === 0} emptyText="No open tasks. Plan some in chat.">
          {nextTasks.map(t => (
            <div key={t.id} className="flex items-center gap-2 py-1.5">
              <StatusBadge status={t.priority} />
              <span className="text-sm text-zinc-700 truncate flex-1">{t.title}</span>
            </div>
          ))}
        </PreviewCard>

        {/* Key risks */}
        <PreviewCard title="Key risks" icon={AlertTriangle} href={`/projects/${project.id}/risks`} empty={keyRisks.length === 0} emptyText="No open risks identified.">
          {keyRisks.map(r => (
            <div key={r.id} className="flex items-center gap-2 py-1.5">
              <StatusBadge status={r.severity} />
              <span className="text-sm text-zinc-700 truncate flex-1">{r.title}</span>
            </div>
          ))}
        </PreviewCard>

        {/* Recent decisions */}
        <PreviewCard title="Recent decisions" icon={GitFork} href={`/projects/${project.id}/decisions`} empty={recentDecisions.length === 0} emptyText="No decisions logged yet.">
          {recentDecisions.map(d => (
            <div key={d.id} className="py-1.5">
              <p className="text-sm text-zinc-700 truncate">{d.decision}</p>
              <p className="text-[11px] text-zinc-400">{new Date(d.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </PreviewCard>

        {/* Roadmap preview */}
        <PreviewCard title="Roadmap" icon={Map} href={`/projects/${project.id}/roadmap`} empty={roadmapPreview.length === 0} emptyText="No roadmap items yet.">
          {roadmapPreview.map(r => (
            <div key={r.id} className="flex items-center gap-2 py-1.5">
              <StatusBadge status={r.status} />
              <span className="text-sm text-zinc-700 truncate flex-1">{r.title}</span>
            </div>
          ))}
        </PreviewCard>
      </div>

      {/* Recent chat activity */}
      <PreviewCard title="Recent chat activity" icon={MessageSquare} href={`/projects/${project.id}/chat`} empty={recentMessages.length === 0} emptyText="No conversation yet — open chat to start planning.">
        {recentMessages.map(m => (
          <div key={m.id} className="py-1.5">
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">{m.role === 'user' ? 'You' : 'AI'}</p>
            <p className="text-sm text-zinc-700 line-clamp-2 leading-relaxed">{m.content}</p>
          </div>
        ))}
      </PreviewCard>

      {/* Edit modal */}
      {showEdit && <EditProjectModal project={project} onClose={() => setShowEdit(false)} />}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDelete}
        title={`Delete “${project.title}”?`}
        description="This permanently removes the project and all its tasks, notes, decisions, risks and roadmap items. This cannot be undone."
        confirmLabel="Delete project"
        onConfirm={async () => {
          await deleteProject(project.id)
          router.replace('/projects')
        }}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}

function PreviewCard({
  title, icon: Icon, href, empty, emptyText, children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  href: string
  empty: boolean
  emptyText: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-zinc-400" />
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</p>
        </div>
        <Link href={href} className="text-zinc-300 hover:text-zinc-600 transition-colors">
          <ArrowRight size={14} />
        </Link>
      </div>
      {empty ? (
        <p className="text-xs text-zinc-400 leading-relaxed py-1">{emptyText}</p>
      ) : (
        <div className="divide-y divide-zinc-50">{children}</div>
      )}
    </div>
  )
}
