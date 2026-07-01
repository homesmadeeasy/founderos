/**
 * Goals Engine — prompts and normalizers (client-safe).
 */

import type { Goal, GoalLink, Project } from '@/lib/types'

export const GOAL_CATEGORIES = [
  'Business', 'Learning', 'Health', 'Career', 'Finance',
  'Creative', 'Personal', 'Relationship', 'Other',
] as const

export const GOAL_STATUSES = ['Active', 'Paused', 'Completed', 'Abandoned'] as const
export const GOAL_PRIORITIES = ['Low', 'Medium', 'High'] as const

export const GOAL_REVIEW_SYSTEM_PROMPT = `You are the Goal Review Engine inside FounderOS.

FounderOS is evolving into a general intelligence operating system.

Your job is to analyse a user's goal, understand progress, identify blockers and conflicts, and recommend next actions.

Use only the provided goal data, linked entities and memory context.
Do not invent unsupported progress.
Be honest, practical and specific.

Return only valid JSON in this shape:

{
  "progress_review": "review of current progress",
  "blockers": "what is blocking this goal",
  "conflicts": "other goals/worlds/actions that may conflict",
  "next_actions": "specific next actions",
  "recommended_focus": "what the user should focus on next",
  "confidence_score": 0,
  "suggested_tasks": [
    {
      "title": "task title",
      "description": "task description",
      "priority": "Low | Medium | High"
    }
  ]
}`

export interface GoalReviewContextInput {
  goal: Goal
  linkedProjects: Project[]
  linkedMemorySummaries: string[]
  otherActiveGoals: Goal[]
}

export interface SuggestedGoalTask {
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High'
}

export interface NormalizedGoalReviewFields {
  progressReview: string
  blockers: string
  conflicts: string
  nextActions: string
  recommendedFocus: string
  confidenceScore: number
  suggestedTasks: SuggestedGoalTask[]
}

export interface GoalReviewRequestBody {
  goal_id: string
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

export function renderGoalReviewContext(input: GoalReviewContextInput): string {
  const { goal, linkedProjects, linkedMemorySummaries, otherActiveGoals } = input
  const list = <T,>(items: T[], fmt: (item: T) => string, empty: string) =>
    items.length ? items.map(i => `  - ${fmt(i)}`).join('\n') : `  (${empty})`

  return `Review this goal. Use ONLY the information below.

GOAL
  Title: ${goal.title}
  Category: ${goal.category}
  Priority: ${goal.priority}
  Status: ${goal.status}
  Progress: ${goal.progress}%
  Timeframe: ${goal.timeframe || '(none)'}
  Success criteria: ${goal.successCriteria || '(none)'}
  Why it matters: ${goal.whyItMatters || '(none)'}
  Constraints: ${goal.constraints || '(none)'}
  Description: ${goal.description || '(none)'}

LINKED WORLDS / PROJECTS (${linkedProjects.length})
${list(linkedProjects, p => `[${p.worldType}] ${p.title} — ${p.status}, ${p.progress}%`, 'none linked')}

OTHER ACTIVE GOALS (${otherActiveGoals.length})
${list(otherActiveGoals.slice(0, 8), g => `${g.title} [${g.category}, ${g.progress}%]`, 'none')}

RELEVANT MEMORY
${list(linkedMemorySummaries.slice(0, 8), s => s, 'no semantic memory matches')}`
}

export function normalizeSuggestedGoalTasks(raw: unknown): SuggestedGoalTask[] {
  if (!Array.isArray(raw)) return []
  const PRIORITIES = ['Low', 'Medium', 'High'] as const
  return raw
    .map((item): SuggestedGoalTask | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const title = str(o.title)
      if (!title) return null
      const p = str(o.priority)
      const priority = (PRIORITIES as readonly string[]).includes(p)
        ? (p as SuggestedGoalTask['priority'])
        : 'Medium'
      return { title, description: str(o.description), priority }
    })
    .filter((t): t is SuggestedGoalTask => t !== null)
    .slice(0, 8)
}

export function normalizeGoalReview(raw: unknown): NormalizedGoalReviewFields {
  if (!raw || typeof raw !== 'object') throw new Error('Goal review did not return an object')
  const o = raw as Record<string, unknown>
  const scoreRaw = typeof o.confidence_score === 'number' ? o.confidence_score : 50
  return {
    progressReview: str(o.progress_review),
    blockers: str(o.blockers),
    conflicts: str(o.conflicts),
    nextActions: str(o.next_actions),
    recommendedFocus: str(o.recommended_focus),
    confidenceScore: Math.min(100, Math.max(0, Math.round(scoreRaw))),
    suggestedTasks: normalizeSuggestedGoalTasks(o.suggested_tasks),
  }
}

export type GoalLinkEntityType = 'project' | 'idea' | 'task' | 'note'

export interface NewGoalLink {
  goalId: string
  entityType: GoalLinkEntityType
  entityId: string
  relationshipType?: string
}
