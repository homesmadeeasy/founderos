/**
 * Idea Architect config and helpers.
 *
 * Safe for the client — contains NO secrets. The OpenAI key is only ever read
 * server-side in app/api/idea-analysis/route.ts.
 *
 * Responsibilities:
 *   - IDEA_SYSTEM_PROMPT: the exact instruction sent to the model.
 *   - renderIdeaContext(): turns an idea into a compact text block.
 *   - normalizeIdeaAnalysis(): coerces arbitrary model JSON into a safe shape.
 *   - normalizeSuggested* helpers: also reused by the db mapper to parse the
 *     jsonb columns back into typed values.
 *   - enum mapping helpers (toProjectStatus, etc.) used by the Turn Into Project
 *     flow to convert the model's human-readable casing into app enum values.
 */

import type {
  Idea, SuggestedProject, SuggestedIdeaTask, SuggestedIdeaRisk, SuggestedIdeaRoadmapItem,
  ProjectStatus, ProjectPriority, TaskPriority, RiskSeverity,
} from './types'
import { AI_MODEL } from './ai'

export { AI_MODEL }

// ─── System prompt ────────────────────────────────────────────────────────────

export const IDEA_SYSTEM_PROMPT = `You are the Idea Architect inside FounderOS.

FounderOS is a personal AI operating system for young builders, founders, coders and ambitious students.

Your job is to help the user turn raw ideas into clear, realistic project opportunities.

Analyse the idea honestly. Challenge assumptions. Identify the target user, problem, value, difficulty, risks, MVP and validation plan.

Do not overhype the idea.
Do not claim demand is guaranteed.
Be practical, specific and action-oriented.

Return only valid JSON in this exact shape:

{
  "summary": "short summary of the idea",
  "target_user_analysis": "who this is for and whether that user is specific enough",
  "problem_analysis": "what problem this solves and whether the pain seems strong",
  "market_potential": "honest view of demand and monetisation potential",
  "difficulty_analysis": "technical, product and go-to-market difficulty",
  "risks": "highest-risk assumptions and what could go wrong",
  "mvp_suggestion": "smallest useful first version",
  "validation_plan": "how to test demand before overbuilding",
  "next_steps": "clear immediate steps",
  "suggested_project": {
    "title": "project title",
    "description": "project description",
    "goal": "project goal",
    "status": "Planning",
    "priority": "Medium",
    "progress": 0
  },
  "suggested_tasks": [
    {
      "title": "task title",
      "description": "task description",
      "priority": "Low | Medium | High"
    }
  ],
  "suggested_risks": [
    {
      "title": "risk title",
      "description": "risk description",
      "severity": "Low | Medium | High",
      "mitigation": "how to reduce this risk",
      "status": "Open"
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

// ─── Context renderer ───────────────────────────────────────────────────────────

export function renderIdeaContext(idea: Idea): string {
  return `Analyse the following raw idea. Use ONLY the information below; if something is missing, say so honestly.

IDEA
  Title: ${idea.title}
  Description: ${idea.description || '(none)'}
  Target user: ${idea.targetUser || '(not specified)'}
  Problem: ${idea.problem || '(not specified)'}
  Possible solution: ${idea.solution || '(not specified)'}
  Self-rated potential: ${idea.potentialScore}/10
  Self-rated difficulty: ${idea.difficultyScore}/10
  Status: ${idea.status}
  Tags: ${idea.tags.length ? idea.tags.join(', ') : '(none)'}`
}

// ─── Normalisation ─────────────────────────────────────────────────────────────

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

const TASK_PRIORITIES   = ['Low', 'Medium', 'High'] as const
const RISK_SEVERITIES    = ['Low', 'Medium', 'High'] as const

export function normalizeSuggestedProject(raw: unknown): SuggestedProject | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const title = str(o.title)
  if (!title) return null
  return {
    title,
    description: str(o.description),
    goal: str(o.goal),
    status: str(o.status) || 'Planning',
    priority: str(o.priority) || 'Medium',
    progress: Math.max(0, Math.min(100, num(o.progress, 0))),
  }
}

export function normalizeSuggestedIdeaTasks(raw: unknown): SuggestedIdeaTask[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): SuggestedIdeaTask | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const title = str(o.title)
      if (!title) return null
      const p = str(o.priority)
      const priority = (TASK_PRIORITIES as readonly string[]).includes(p)
        ? (p as SuggestedIdeaTask['priority']) : 'Medium'
      return { title, description: str(o.description), priority }
    })
    .filter((t): t is SuggestedIdeaTask => t !== null)
    .slice(0, 12)
}

export function normalizeSuggestedIdeaRisks(raw: unknown): SuggestedIdeaRisk[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): SuggestedIdeaRisk | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const title = str(o.title)
      if (!title) return null
      const s = str(o.severity)
      const severity = (RISK_SEVERITIES as readonly string[]).includes(s)
        ? (s as SuggestedIdeaRisk['severity']) : 'Medium'
      return { title, description: str(o.description), severity, mitigation: str(o.mitigation), status: str(o.status) || 'Open' }
    })
    .filter((r): r is SuggestedIdeaRisk => r !== null)
    .slice(0, 12)
}

export function normalizeSuggestedIdeaRoadmapItems(raw: unknown): SuggestedIdeaRoadmapItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): SuggestedIdeaRoadmapItem | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const title = str(o.title)
      if (!title) return null
      return { title, description: str(o.description), stage: str(o.stage) || 'Next', status: str(o.status) || 'Planned' }
    })
    .filter((r): r is SuggestedIdeaRoadmapItem => r !== null)
    .slice(0, 12)
}

export interface NormalizedIdeaAnalysisFields {
  summary: string
  targetUserAnalysis: string
  problemAnalysis: string
  marketPotential: string
  difficultyAnalysis: string
  risks: string
  mvpSuggestion: string
  validationPlan: string
  nextSteps: string
  suggestedProject: SuggestedProject | null
  suggestedTasks: SuggestedIdeaTask[]
  suggestedRisks: SuggestedIdeaRisk[]
  suggestedRoadmapItems: SuggestedIdeaRoadmapItem[]
}

export function normalizeIdeaAnalysis(raw: unknown): NormalizedIdeaAnalysisFields {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Analysis did not return an object')
  }
  const o = raw as Record<string, unknown>
  return {
    summary:            str(o.summary),
    targetUserAnalysis: str(o.target_user_analysis),
    problemAnalysis:    str(o.problem_analysis),
    marketPotential:    str(o.market_potential),
    difficultyAnalysis: str(o.difficulty_analysis),
    risks:              str(o.risks),
    mvpSuggestion:      str(o.mvp_suggestion),
    validationPlan:     str(o.validation_plan),
    nextSteps:          str(o.next_steps),
    suggestedProject:        normalizeSuggestedProject(o.suggested_project),
    suggestedTasks:          normalizeSuggestedIdeaTasks(o.suggested_tasks),
    suggestedRisks:          normalizeSuggestedIdeaRisks(o.suggested_risks),
    suggestedRoadmapItems:   normalizeSuggestedIdeaRoadmapItems(o.suggested_roadmap_items),
  }
}

// ─── Enum mapping (model casing → app enum values) ──────────────────────────────

export function toProjectStatus(v: string): ProjectStatus {
  const s = v.toLowerCase()
  const allowed: ProjectStatus[] = ['idea', 'planning', 'building', 'testing', 'launched', 'paused', 'archived']
  return (allowed as string[]).includes(s) ? (s as ProjectStatus) : 'planning'
}

export function toProjectPriority(v: string): ProjectPriority {
  const s = v.toLowerCase()
  return s === 'low' || s === 'high' ? (s as ProjectPriority) : 'medium'
}

export function toTaskPriority(v: string): TaskPriority {
  const s = v.toLowerCase()
  return s === 'low' || s === 'high' ? (s as TaskPriority) : 'medium'
}

export function toRiskSeverity(v: string): RiskSeverity {
  const s = v.toLowerCase()
  return s === 'low' || s === 'high' || s === 'critical' ? (s as RiskSeverity) : 'medium'
}

// ─── API payload types ───────────────────────────────────────────────────────

export interface IdeaAnalysisRequestBody {
  idea_id: string
}
