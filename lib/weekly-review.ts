/**
 * Global Weekly Review config and helpers.
 *
 * Safe for the client — contains NO secrets. The OpenAI key is only ever read
 * server-side in app/api/weekly-review/route.ts.
 */

import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Idea, ProjectFile, Link, Message,
  SuggestedWeeklyTask, SuggestedProjectReviewRef,
} from './types'
import { AI_MODEL } from './ai'

export { AI_MODEL }

export const MAX_WEEKLY_MESSAGES = 20

// ─── System prompt ────────────────────────────────────────────────────────────

export const WEEKLY_REVIEW_SYSTEM_PROMPT = `You are the Weekly Review Engine inside FounderOS.

FounderOS is a personal AI operating system for young builders, founders, coders and ambitious students.

Your job is to review the user's entire workspace and help them maintain momentum.

Analyse:
- active projects
- completed tasks
- open tasks
- stuck projects
- risks
- decisions
- roadmap items
- ideas
- uploaded files
- project reviews
- linked memory
- recent activity

Be honest, practical and action-oriented.

Do not invent work that is not shown in the data.
If there is not enough data, say what is missing.
Focus on what the user should do next.

Return only valid JSON in this exact shape:

{
  "summary": "short summary of the week",
  "completed_work": "what appears to have been completed",
  "active_projects": "main active projects and their state",
  "stuck_projects": "projects that appear stuck or need attention",
  "key_decisions": "important decisions made or needed",
  "key_risks": "important risks across the workspace",
  "ideas_to_revisit": "ideas worth revisiting",
  "files_added": "uploaded files and why they matter",
  "memory_insights": "notable patterns from linked memory",
  "next_week_focus": "clear focus plan for next week",
  "suggested_tasks": [
    {
      "project_id": "project id if known",
      "title": "task title",
      "description": "task description",
      "priority": "Low | Medium | High"
    }
  ],
  "suggested_project_reviews": [
    {
      "project_id": "project id",
      "reason": "why this project should be reviewed"
    }
  ]
}`

// ─── Week bounds ──────────────────────────────────────────────────────────────

/** Returns Monday–Sunday bounds for the week containing `date`. */
export function getWeekBounds(date = new Date()): { weekStart: string; weekEnd: string } {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  }
}

function isOnOrAfter(isoDate: string, weekStart: string): boolean {
  return isoDate.slice(0, 10) >= weekStart
}

// ─── Context input ────────────────────────────────────────────────────────────

export interface ProjectReviewSummary {
  id: string
  projectId: string
  projectTitle: string
  summary: string
  createdAt: string
}

export interface WeeklyReviewContextInput {
  weekStart: string
  weekEnd: string
  projects: Project[]
  ideas: Idea[]
  tasks: Task[]
  notes: Note[]
  decisions: Decision[]
  risks: Risk[]
  roadmapItems: RoadmapItem[]
  projectReviews: ProjectReviewSummary[]
  projectFiles: ProjectFile[]
  links: Link[]
  recentMessages: Array<{ projectId: string; projectTitle: string; role: string; content: string; createdAt: string }>
  linkedMemorySummaries: string[]
}

export function renderWeeklyContext(input: WeeklyReviewContextInput): string {
  const {
    weekStart, weekEnd, projects, ideas, tasks, notes, decisions, risks,
    roadmapItems, projectReviews, projectFiles, recentMessages, linkedMemorySummaries,
  } = input

  const list = <T,>(items: T[], fmt: (item: T) => string, empty: string) =>
    items.length ? items.map(i => `  - ${fmt(i)}`).join('\n') : `  (${empty})`

  const activeProjects = projects.filter(p => p.status !== 'archived')
  const openTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const weekDoneTasks = doneTasks.filter(t => isOnOrAfter(t.createdAt, weekStart))
  const weekDecisions = decisions.filter(d => isOnOrAfter(d.createdAt, weekStart))
  const weekFiles = projectFiles.filter(f => isOnOrAfter(f.createdAt, weekStart))
  const weekReviews = projectReviews.filter(r => isOnOrAfter(r.createdAt, weekStart))
  const openRisks = risks.filter(r => r.status === 'open')

  const projectMap = new Map(projects.map(p => [p.id, p.title]))

  return `Review the user's entire FounderOS workspace. Use ONLY the information below.
Week under review: ${weekStart} to ${weekEnd}

PROJECTS (${activeProjects.length} active)
${list(activeProjects.slice(0, 20), p =>
  `[id: ${p.id}] ${p.title} — status: ${p.status}, priority: ${p.priority}, progress: ${p.progress}%, updated: ${p.updatedAt.slice(0, 10)}`,
  'no active projects')}

COMPLETED TASKS THIS WEEK (${weekDoneTasks.length} of ${doneTasks.length} total done)
${list(weekDoneTasks.slice(0, 20), t =>
  `[project: ${projectMap.get(t.projectId) ?? t.projectId}] ${t.title}`,
  'none completed this week')}

OPEN TASKS (${openTasks.length})
${list(openTasks.slice(0, 25), t =>
  `[id: ${t.projectId}] ${t.title} [${t.status}, ${t.priority}]`,
  'no open tasks')}

DECISIONS THIS WEEK (${weekDecisions.length} of ${decisions.length} total)
${list(weekDecisions.slice(0, 10), d =>
  `[${projectMap.get(d.projectId) ?? d.projectId}] ${d.decision}`,
  'none this week')}

OPEN RISKS (${openRisks.length})
${list(openRisks.slice(0, 15), r =>
  `[${projectMap.get(r.projectId) ?? r.projectId}] ${r.title} [${r.severity}]`,
  'no open risks')}

ROADMAP ITEMS (${roadmapItems.length})
${list(roadmapItems.slice(0, 15), r =>
  `[${projectMap.get(r.projectId) ?? r.projectId}] ${r.title} [${r.stage}, ${r.status}]`,
  'no roadmap items')}

IDEAS (${ideas.length})
${list(ideas.slice(0, 15), i =>
  `[id: ${i.id}] ${i.title} — ${i.status}, potential ${i.potentialScore}/10`,
  'no ideas')}

FILES ADDED THIS WEEK (${weekFiles.length})
${list(weekFiles.slice(0, 10), f =>
  `[${projectMap.get(f.projectId) ?? f.projectId}] ${f.fileName}${f.summary ? `: ${f.summary.replace(/\s+/g, ' ').slice(0, 120)}` : ''}`,
  'no files this week')}

PROJECT REVIEWS THIS WEEK (${weekReviews.length})
${list(weekReviews.slice(0, 8), r =>
  `[${r.projectTitle}] ${r.summary.replace(/\s+/g, ' ').slice(0, 160)}`,
  'no project reviews this week')}

RECENT CHAT (last ${recentMessages.length} messages across projects)
${list(recentMessages.slice(0, MAX_WEEKLY_MESSAGES), m =>
  `[${m.projectTitle}] ${m.role === 'user' ? 'User' : 'AI'}: ${m.content.replace(/\s+/g, ' ').slice(0, 180)}`,
  'no recent chat')}

LINKED MEMORY (patterns across the workspace)
${list(linkedMemorySummaries.slice(0, 12), s => s, 'no linked memory yet')}`
}

// ─── Normalisation ────────────────────────────────────────────────────────────

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const

export function normalizeSuggestedWeeklyTasks(raw: unknown): SuggestedWeeklyTask[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): SuggestedWeeklyTask | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const title = str(o.title)
      if (!title) return null
      const p = str(o.priority)
      const priority = (TASK_PRIORITIES as readonly string[]).includes(p)
        ? (p as SuggestedWeeklyTask['priority'])
        : 'Medium'
      const projectId = str(o.project_id) || undefined
      return { projectId, title, description: str(o.description), priority }
    })
    .filter((t): t is SuggestedWeeklyTask => t !== null)
    .slice(0, 12)
}

export function normalizeSuggestedProjectReviews(raw: unknown): SuggestedProjectReviewRef[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): SuggestedProjectReviewRef | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const projectId = str(o.project_id)
      const reason = str(o.reason)
      if (!projectId || !reason) return null
      return { projectId, reason }
    })
    .filter((r): r is SuggestedProjectReviewRef => r !== null)
    .slice(0, 8)
}

export interface NormalizedWeeklyReviewFields {
  summary: string
  completedWork: string
  activeProjects: string
  stuckProjects: string
  keyDecisions: string
  keyRisks: string
  ideasToRevisit: string
  filesAdded: string
  memoryInsights: string
  nextWeekFocus: string
  suggestedTasks: SuggestedWeeklyTask[]
  suggestedProjectReviews: SuggestedProjectReviewRef[]
}

export function normalizeWeeklyReview(raw: unknown): NormalizedWeeklyReviewFields {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Weekly review did not return an object')
  }
  const o = raw as Record<string, unknown>
  return {
    summary:               str(o.summary),
    completedWork:         str(o.completed_work),
    activeProjects:        str(o.active_projects),
    stuckProjects:         str(o.stuck_projects),
    keyDecisions:          str(o.key_decisions),
    keyRisks:              str(o.key_risks),
    ideasToRevisit:        str(o.ideas_to_revisit),
    filesAdded:            str(o.files_added),
    memoryInsights:        str(o.memory_insights),
    nextWeekFocus:         str(o.next_week_focus),
    suggestedTasks:          normalizeSuggestedWeeklyTasks(o.suggested_tasks),
    suggestedProjectReviews: normalizeSuggestedProjectReviews(o.suggested_project_reviews),
  }
}
