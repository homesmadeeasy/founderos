'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Target, CheckSquare, AlertTriangle, Activity, Lightbulb, Sparkles, Network,
  FolderKanban, ArrowRight, MessageSquare, CalendarCheck2, GitBranch, Loader2,
} from 'lucide-react'
import { loadWeeklyReviews, loadLatestPatternAnalysis } from '@/lib/db'
import { useAppContext } from '@/contexts/AppContext'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import CreateProjectModal from '@/components/ui/CreateProjectModal'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'
import EmptyState from '@/components/ui/EmptyState'
import StartHereSection from '@/components/dashboard/StartHereSection'
import { buildLabelResolver, describeLink } from '@/lib/links'
import type { Project, Task, WeeklyReview, PatternAnalysis } from '@/lib/types'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

interface ReviewPreview {
  id: string
  projectId: string
  projectTitle: string
  summary: string
  createdAt: string
}

function Section({
  title, icon: Icon, href, children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  href?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-0.5">
            View all <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { appState, isHydrated, loadError } = useAppContext()
  const [recentReviews, setRecentReviews] = useState<ReviewPreview[]>([])
  const [latestWeeklyReview, setLatestWeeklyReview] = useState<WeeklyReview | null>(null)
  const [latestPatternAnalysis, setLatestPatternAnalysis] = useState<PatternAnalysis | null>(null)
  const [generatingPattern, setGeneratingPattern] = useState(false)

  useEffect(() => {
    if (!isHydrated) return
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase
        .from('project_reviews')
        .select('id, project_id, summary, created_at')
        .order('created_at', { ascending: false })
        .limit(3)
      if (data) {
        setRecentReviews(data.map(r => ({
          id: r.id,
          projectId: r.project_id,
          projectTitle: appState.projects.find(p => p.id === r.project_id)?.title ?? 'Project',
          summary: r.summary ?? '',
          createdAt: r.created_at,
        })))
      }

      try {
        const weekly = await loadWeeklyReviews(supabase)
        setLatestWeeklyReview(weekly[0] ?? null)
      } catch (err) {
        console.error('[Dashboard] loadWeeklyReviews failed:', err)
      }

      try {
        const pattern = await loadLatestPatternAnalysis(supabase)
        setLatestPatternAnalysis(pattern)
      } catch (err) {
        console.error('[Dashboard] loadLatestPatternAnalysis failed:', err)
      }
    })()
  }, [isHydrated, appState.projects])

  async function generatePatternAnalysis() {
    setGeneratingPattern(true)
    try {
      const res = await fetch('/api/pattern-analysis', { method: 'POST' })
      const data = await res.json() as { analysis?: PatternAnalysis; error?: string }
      if (res.ok && data.analysis) {
        setLatestPatternAnalysis(data.analysis)
      }
    } catch (err) {
      console.error('[Dashboard] generate pattern analysis failed:', err)
    } finally {
      setGeneratingPattern(false)
    }
  }

  const derived = useMemo(() => {
    const { projects, tasks, risks, ideas, links, notes, decisions } = appState

    const openTasks = tasks.filter(t => t.status !== 'done')
    const nextTasks = [...openTasks]
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
      .slice(0, 5)

    const inProgress = tasks.find(t => t.status === 'in_progress')
    const focusTask = inProgress ?? nextTasks[0]

    const needingAttention = projects
      .filter(p => !['archived', 'launched'].includes(p.status))
      .map(p => {
        const pTasks = tasks.filter(t => t.projectId === p.id && t.status !== 'done')
        const pRisks = risks.filter(r => r.projectId === p.id && r.status === 'open')
        const daysStale = (Date.now() - new Date(p.updatedAt).getTime()) / 86400000
        const score =
          pTasks.filter(t => t.priority === 'high').length * 3 +
          pRisks.length * 2 +
          pTasks.length +
          (daysStale > 7 ? 1 : 0)
        return { project: p, score, openTasks: pTasks.length, openRisks: pRisks.length }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)

    const focusProject = needingAttention[0]?.project
      ?? projects.find(p => !['archived', 'paused'].includes(p.status))

    const ideasToRevisit = ideas
      .filter(i => ['Raw', 'Exploring', 'Validated'].includes(i.status))
      .sort((a, b) => b.potentialScore - a.potentialScore || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4)

    const resolve = buildLabelResolver(appState)
    const memoryLinks = [...links]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(l => ({ id: l.id, text: describeLink(l, resolve), href: findLinkHref(l, appState.projects) }))

    type ActivityItem = { id: string; label: string; sub: string; href: string; at: number }
    const activity: ActivityItem[] = []
    tasks.slice(0, 15).forEach(t => {
      const p = projects.find(pr => pr.id === t.projectId)
      activity.push({
        id: `task-${t.id}`, label: `Task: ${t.title}`, sub: p?.title ?? 'Project',
        href: `/projects/${t.projectId}/tasks`, at: new Date(t.createdAt).getTime(),
      })
    })
    notes.slice(0, 10).forEach(n => {
      const p = projects.find(pr => pr.id === n.projectId)
      activity.push({
        id: `note-${n.id}`, label: `Note: ${n.title}`, sub: p?.title ?? 'Project',
        href: `/projects/${n.projectId}/notes`, at: new Date(n.createdAt).getTime(),
      })
    })
    decisions.slice(0, 8).forEach(d => {
      const p = projects.find(pr => pr.id === d.projectId)
      activity.push({
        id: `dec-${d.id}`, label: `Decision logged`, sub: p?.title ?? 'Project',
        href: `/projects/${d.projectId}/decisions`, at: new Date(d.createdAt).getTime(),
      })
    })
    projects.forEach(p => {
      activity.push({
        id: `proj-${p.id}`, label: `Project updated: ${p.title}`, sub: p.status,
        href: `/projects/${p.id}`, at: new Date(p.updatedAt).getTime(),
      })
    })
    const recentActivity = activity.sort((a, b) => b.at - a.at).slice(0, 6)

    const stats = {
      activeProjects: projects.filter(p => !['archived', 'paused'].includes(p.status)).length,
      openTasks: openTasks.length,
      openRisks: risks.filter(r => r.status === 'open').length,
      ideas: ideas.length,
    }

    return {
      nextTasks, focusTask, focusProject, needingAttention, ideasToRevisit,
      memoryLinks, recentActivity, stats,
    }
  }, [appState])

  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading your dashboard…" /></div>
  if (loadError)   return <div className="p-6"><ErrorScreen message={loadError} /></div>

  const { projects } = appState

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">FounderOS</p>
          <h1 className="text-xl font-bold text-zinc-900 mt-0.5">Home base</h1>
          <p className="text-sm text-zinc-500 mt-1">Your operating system for building, planning and momentum.</p>
        </div>
        <CreateProjectModal />
      </div>

      <StartHereSection />

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active projects', value: derived.stats.activeProjects, color: 'text-blue-600' },
          { label: 'Open tasks', value: derived.stats.openTasks, color: 'text-orange-600' },
          { label: 'Open risks', value: derived.stats.openRisks, color: 'text-red-600' },
          { label: 'Ideas captured', value: derived.stats.ideas, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-zinc-100 px-4 py-3">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Today's Focus */}
      <Section title="Today's Focus" icon={Target}>
        {derived.focusTask || derived.focusProject ? (
          <div className="p-5 space-y-3">
            {derived.focusTask && (
              <Link href={`/projects/${derived.focusTask.projectId}/tasks`} className="block rounded-lg bg-zinc-50 border border-zinc-100 p-4 hover:border-zinc-200 transition-colors">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Primary task</p>
                <p className="text-sm font-semibold text-zinc-900">{derived.focusTask.title}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {projects.find(p => p.id === derived.focusTask!.projectId)?.title}
                  {' · '}
                  <StatusBadge status={derived.focusTask.priority} />
                </p>
              </Link>
            )}
            {derived.focusProject && (
              <Link href={`/projects/${derived.focusProject.id}/chat`} className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-3 hover:bg-zinc-50 transition-colors">
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Focus project</p>
                  <p className="text-sm font-medium text-zinc-800">{derived.focusProject.title}</p>
                </div>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <MessageSquare size={12} /> Open chat
                </span>
              </Link>
            )}
          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="Nothing queued yet"
            description="Create a project or capture an idea to set your focus for today."
            action={{ label: 'Create project', href: '/projects' }}
          />
        )}
      </Section>

      {/* Latest Pattern Insight */}
      <Section title="Latest Pattern Insight" icon={GitBranch} href="/patterns">
        {latestPatternAnalysis ? (
          <Link href="/patterns" className="block px-5 py-4 hover:bg-zinc-50 transition-colors">
            <p className="text-[11px] text-zinc-400">
              {new Date(latestPatternAnalysis.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-sm font-medium text-zinc-800 mt-1 line-clamp-2">{latestPatternAnalysis.summary}</p>
            {latestPatternAnalysis.bottlenecks && (
              <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                <span className="font-medium text-zinc-600">Key bottleneck: </span>
                {latestPatternAnalysis.bottlenecks}
              </p>
            )}
            {latestPatternAnalysis.recommendedChanges && (
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                <span className="font-medium text-zinc-600">Recommended change: </span>
                {latestPatternAnalysis.recommendedChanges}
              </p>
            )}
          </Link>
        ) : (
          <div className="px-5 py-4">
            <EmptyState
              icon={GitBranch}
              title="No pattern analysis yet"
              description="Generate a cross-project pattern analysis to understand recurring strengths, bottlenecks and opportunities across your workspace."
              action={{
                label: generatingPattern ? 'Generating…' : 'Generate pattern analysis',
                onClick: generatingPattern ? undefined : () => void generatePatternAnalysis(),
              }}
            />
            {generatingPattern && (
              <div className="flex justify-center mt-3">
                <Loader2 size={16} className="animate-spin text-zinc-400" />
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Latest Weekly Review */}
      <Section title="Latest Weekly Review" icon={CalendarCheck2} href="/weekly-review">
        {latestWeeklyReview ? (
          <Link href="/weekly-review" className="block px-5 py-4 hover:bg-zinc-50 transition-colors">
            <p className="text-[11px] text-zinc-400">
              {new Date(latestWeeklyReview.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {latestWeeklyReview.weekStart} – {latestWeeklyReview.weekEnd}
            </p>
            <p className="text-sm font-medium text-zinc-800 mt-1 line-clamp-2">{latestWeeklyReview.summary}</p>
            {latestWeeklyReview.nextWeekFocus && (
              <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                <span className="font-medium text-zinc-600">Next week: </span>
                {latestWeeklyReview.nextWeekFocus}
              </p>
            )}
          </Link>
        ) : (
          <EmptyState
            icon={CalendarCheck2}
            title="No weekly review yet"
            description="Generate a cross-workspace weekly review to maintain momentum across everything you're building."
            action={{ label: 'Generate weekly review', href: '/weekly-review' }}
          />
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next tasks */}
        <Section title="Next tasks to work on" icon={CheckSquare} href="/projects">
          {derived.nextTasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="All caught up" description="No open tasks right now. Use project chat to plan your next move." />
          ) : (
            <div className="divide-y divide-zinc-50">
              {derived.nextTasks.map(t => (
                <TaskRow key={t.id} task={t} projectTitle={projects.find(p => p.id === t.projectId)?.title} />
              ))}
            </div>
          )}
        </Section>

        {/* Projects needing attention */}
        <Section title="Projects needing attention" icon={AlertTriangle} href="/projects">
          {derived.needingAttention.length === 0 ? (
            <EmptyState icon={FolderKanban} title="Looking healthy" description="No projects flagged for attention. Keep building momentum." />
          ) : (
            <div className="divide-y divide-zinc-50">
              {derived.needingAttention.map(({ project, openTasks, openRisks }) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate group-hover:text-zinc-900">{project.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {openTasks} open task{openTasks === 1 ? '' : 's'}
                      {openRisks > 0 ? ` · ${openRisks} open risk${openRisks === 1 ? '' : 's'}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Recent activity */}
      <Section title="Recent activity" icon={Activity}>
        {derived.recentActivity.length === 0 ? (
          <EmptyState icon={Activity} title="Quiet so far" description="Activity from tasks, notes, decisions and projects will show up here." />
        ) : (
          <div className="divide-y divide-zinc-50">
            {derived.recentActivity.map(a => (
              <Link key={a.id} href={a.href} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-800 truncate">{a.label}</p>
                  <p className="text-xs text-zinc-400">{a.sub}</p>
                </div>
                <span className="text-[11px] text-zinc-400 shrink-0 ml-3">
                  {new Date(a.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ideas to revisit */}
        <Section title="Ideas to revisit" icon={Lightbulb} href="/ideas">
          {derived.ideasToRevisit.length === 0 ? (
            <EmptyState icon={Lightbulb} title="Idea Vault is empty" description="Capture raw ideas before they slip away." action={{ label: 'Open Idea Vault', href: '/ideas' }} />
          ) : (
            <div className="divide-y divide-zinc-50">
              {derived.ideasToRevisit.map(idea => (
                <Link key={idea.id} href={`/ideas/${idea.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{idea.title}</p>
                    <p className="text-xs text-zinc-400">Potential {idea.potentialScore}/10</p>
                  </div>
                  <StatusBadge status={idea.status} />
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* Latest reviews */}
        <Section title="Latest project reviews" icon={Sparkles}>
          {recentReviews.length === 0 ? (
            <EmptyState icon={Sparkles} title="No reviews yet" description="Open a project and generate a review to get AI-powered next steps." action={{ label: 'Browse projects', href: '/projects' }} />
          ) : (
            <div className="divide-y divide-zinc-50">
              {recentReviews.map(r => (
                <Link key={r.id} href={`/projects/${r.projectId}/review`} className="block px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                  <p className="text-xs font-medium text-zinc-500">{r.projectTitle}</p>
                  <p className="text-sm text-zinc-800 line-clamp-2 mt-0.5">{r.summary || 'Review generated'}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Memory links */}
      <Section title="Recent memory links" icon={Network} href={projects[0] ? `/projects/${projects[0].id}/memory` : undefined}>
        {derived.memoryLinks.length === 0 ? (
          <EmptyState icon={Network} title="No linked memory yet" description="As you convert AI responses, review projects and turn ideas into projects, FounderOS builds a memory graph." />
        ) : (
          <ul className="px-5 py-3 space-y-2">
            {derived.memoryLinks.map(l => (
              <li key={l.id}>
                <Link href={l.href} className="text-sm text-zinc-700 hover:text-zinc-900 leading-relaxed flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                  {l.text}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function TaskRow({ task, projectTitle }: { task: Task; projectTitle?: string }) {
  return (
    <Link href={`/projects/${task.projectId}/tasks`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors group">
      <div className={`w-2 h-2 rounded-full shrink-0 ${
        task.priority === 'high' ? 'bg-orange-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-zinc-300'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-800 truncate">{task.title}</p>
        {projectTitle && <p className="text-xs text-zinc-400">{projectTitle}</p>}
      </div>
      <StatusBadge status={task.status} />
    </Link>
  )
}

function findLinkHref(
  link: { sourceType: string; sourceId: string; targetType: string; targetId: string },
  projects: Project[],
): string {
  if (link.sourceType === 'weekly_review' || link.targetType === 'weekly_review') {
    return '/weekly-review'
  }
  if (link.sourceType === 'pattern_analysis' || link.targetType === 'pattern_analysis') {
    return '/patterns'
  }
  const projectId =
    link.sourceType === 'project' ? link.sourceId :
    link.targetType === 'project' ? link.targetId :
    projects[0]?.id
  if (link.targetType === 'idea' || link.sourceType === 'idea') return `/ideas/${link.sourceType === 'idea' ? link.sourceId : link.targetId}`
  return projectId ? `/projects/${projectId}/memory` : '/projects'
}
