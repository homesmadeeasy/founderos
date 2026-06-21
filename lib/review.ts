/**
 * Project Review config and helpers.
 *
 * Safe for the client — contains NO secrets. The OpenAI key is only ever read
 * server-side in app/api/project-review/route.ts.
 *
 * Responsibilities:
 *   - REVIEW_SYSTEM_PROMPT: the exact instruction sent to the model.
 *   - renderReviewContext(): turns project data into a compact text block.
 *   - normalizeReview(): coerces arbitrary model JSON into a safe shape.
 *   - normalizeSuggestedTasks/RoadmapItems(): also reused by the db mapper to
 *     parse the jsonb columns back into typed arrays.
 */

import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Message, ProjectFile,
  SuggestedReviewTask, SuggestedReviewRoadmapItem,
} from './types'
import { AI_MODEL } from './ai'

export { AI_MODEL }

/** Cap on recent chat messages sent to the model (privacy + token budget). */
export const MAX_REVIEW_MESSAGES = 15

// ─── System prompt ────────────────────────────────────────────────────────────

export const REVIEW_SYSTEM_PROMPT = `You are the Project Review Engine inside FounderOS.

FounderOS is a personal AI operating system for young builders, founders, coders and ambitious students.

Your job is to review the current state of a project and help the user maintain momentum.

Analyse:
- project goal
- current progress
- completed tasks
- open tasks
- risks
- decisions
- roadmap
- recent chat history
- blockers
- missing next steps

Return a practical project review.

Be honest, specific and action-oriented.

Do not invent information that is not present in the project context.
If information is missing, say what is missing.
Do not claim that work has been completed unless it is shown in the project data.
Focus on helping the user decide what to do next.

Return only valid JSON in this exact shape:

{
  "summary": "short summary of the current project",
  "progress_review": "review of the project progress",
  "completed_work": "what appears to be completed",
  "blockers": "current blockers or likely blockers",
  "key_risks": "most important risks",
  "key_decisions": "important decisions already made or needed",
  "next_7_day_plan": "clear 7-day plan",
  "suggested_tasks": [
    {
      "title": "task title",
      "description": "task description",
      "priority": "Low | Medium | High"
    }
  ],
  "suggested_roadmap_items": [
    {
      "title": "roadmap item title",
      "description": "roadmap item description",
      "stage": "Now | Next | Later",
      "status": "Planned"
    }
  ]
}`

// ─── Context input ────────────────────────────────────────────────────────────

export interface ReviewContextInput {
  project: Project
  tasks: Task[]
  notes: Note[]
  decisions: Decision[]
  risks: Risk[]
  roadmapItems: RoadmapItem[]
  messages: Message[]
  projectFiles?: ProjectFile[]
  /** Plain-English summaries of how items in this project are connected. */
  linkedMemory?: string[]
}

/** Render the project state into a concise text block for the model. */
export function renderReviewContext(input: ReviewContextInput): string {
  const { project, tasks, notes, decisions, risks, roadmapItems, messages, projectFiles = [], linkedMemory = [] } = input

  const list = <T,>(items: T[], fmt: (item: T) => string, empty: string) =>
    items.length ? items.map(i => `  - ${fmt(i)}`).join('\n') : `  (${empty})`

  const openTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const recent = messages.slice(-MAX_REVIEW_MESSAGES)

  return `Review the current state of this project. Use ONLY the information below.

PROJECT
  Title: ${project.title}
  Description: ${project.description || '(none)'}
  Goal: ${project.goal || '(none)'}
  Status: ${project.status}
  Priority: ${project.priority}
  Progress: ${project.progress}%

COMPLETED TASKS (${doneTasks.length})
${list(doneTasks, t => `${t.title} [${t.priority}]`, 'none marked done')}

OPEN TASKS (${openTasks.length})
${list(openTasks.slice(0, 25), t => `${t.title} [${t.status}, ${t.priority}]`, 'no open tasks')}

NOTES (${notes.length})
${list(notes.slice(0, 15), n => n.title, 'no notes')}

DECISIONS (${decisions.length})
${list(decisions.slice(0, 15), d => d.decision, 'no decisions logged')}

RISKS (${risks.length})
${list(risks.slice(0, 15), r => `${r.title} [${r.severity}, ${r.status}]`, 'no risks identified')}

ROADMAP (${roadmapItems.length})
${list(roadmapItems.slice(0, 20), r => `${r.title} [${r.stage || 'unstaged'}, ${r.status}]`, 'no roadmap items')}

PROJECT FILES (${projectFiles.length})
${list(projectFiles.slice(0, 15), f => {
  const summary = f.summary?.trim()
  return summary
    ? `${f.fileName} [${f.status}]: ${summary.replace(/\s+/g, ' ').slice(0, 200)}`
    : `${f.fileName} [${f.status}]`
}, 'no files uploaded')}

RECENT CHAT (last ${recent.length} messages)
${list(recent, m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.replace(/\s+/g, ' ').slice(0, 240)}`, 'no chat history')}

LINKED MEMORY (how items in this project connect — e.g. which risks block tasks, which tasks came from reviews, which project came from an idea)
${list(linkedMemory.slice(0, 15), s => s, 'no linked memory yet')}`
}

// ─── Normalisation ─────────────────────────────────────────────────────────────

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const

export function normalizeSuggestedTasks(raw: unknown): SuggestedReviewTask[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): SuggestedReviewTask | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const title = str(o.title)
      if (!title) return null
      const p = str(o.priority)
      const priority = (TASK_PRIORITIES as readonly string[]).includes(p)
        ? (p as SuggestedReviewTask['priority'])
        : 'Medium'
      return { title, description: str(o.description), priority }
    })
    .filter((t): t is SuggestedReviewTask => t !== null)
    .slice(0, 12)
}

export function normalizeSuggestedRoadmapItems(raw: unknown): SuggestedReviewRoadmapItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): SuggestedReviewRoadmapItem | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const title = str(o.title)
      if (!title) return null
      return {
        title,
        description: str(o.description),
        stage: str(o.stage) || 'Next',
        status: str(o.status) || 'Planned',
      }
    })
    .filter((r): r is SuggestedReviewRoadmapItem => r !== null)
    .slice(0, 12)
}

/** The text fields of a normalised review (everything except the suggestion arrays). */
export interface NormalizedReviewFields {
  summary: string
  progressReview: string
  completedWork: string
  blockers: string
  keyRisks: string
  keyDecisions: string
  next7DayPlan: string
  suggestedTasks: SuggestedReviewTask[]
  suggestedRoadmapItems: SuggestedReviewRoadmapItem[]
}

/** Coerce the model's JSON output into a safe, fully-populated review. */
export function normalizeReview(raw: unknown): NormalizedReviewFields {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Review did not return an object')
  }
  const o = raw as Record<string, unknown>
  return {
    summary:        str(o.summary),
    progressReview: str(o.progress_review),
    completedWork:  str(o.completed_work),
    blockers:       str(o.blockers),
    keyRisks:       str(o.key_risks),
    keyDecisions:   str(o.key_decisions),
    next7DayPlan:   str(o.next_7_day_plan),
    suggestedTasks:         normalizeSuggestedTasks(o.suggested_tasks),
    suggestedRoadmapItems:  normalizeSuggestedRoadmapItems(o.suggested_roadmap_items),
  }
}

// ─── API payload types ───────────────────────────────────────────────────────

export interface ProjectReviewRequestBody {
  project_id: string
}
