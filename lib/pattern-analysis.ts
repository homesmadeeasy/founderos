/**
 * Cross-Project Pattern Analysis config and helpers.
 *
 * Safe for the client — contains NO secrets.
 */

import type {
  Project, Task, Idea, Decision, Risk, SuggestedPatternAction, PatternAnalysisSnapshot,
} from './types'
import type { ProjectDnaSummary, ProjectReviewSummary } from './weekly-review'
import { AI_MODEL } from './ai'

export { AI_MODEL }

export const PATTERN_ANALYSIS_SYSTEM_PROMPT = `You are the Cross-Project Pattern Engine inside FounderOS.

FounderOS is a personal AI operating system for young builders, founders, coders and ambitious students.

Your job is to analyse the user's workspace and identify recurring patterns across their projects, ideas, tasks, risks, decisions, reviews, files and Project DNA profiles.

You are not reviewing one project.
You are analysing how the user works across all projects.

Look for:
- recurring strengths
- recurring weaknesses
- execution habits
- idea generation patterns
- risk patterns
- decision-making patterns
- project momentum patterns
- bottlenecks
- opportunities
- useful behavioural insights
- recommended changes

Be honest, practical and specific.

Do not overhype.
Do not invent patterns that are not supported by the data.
If there is not enough data, say that clearly.
Use cautious language when confidence is low.

Return only valid JSON in this exact shape:

{
  "summary": "short summary of the user's cross-project patterns",
  "recurring_strengths": "patterns showing what the user does well",
  "recurring_weaknesses": "patterns showing where the user struggles",
  "execution_patterns": "how the user tends to execute projects",
  "idea_patterns": "how the user tends to create, analyse and convert ideas",
  "risk_patterns": "recurring risks or types of risk across projects",
  "decision_patterns": "how decisions are being made or avoided",
  "project_momentum_patterns": "which projects are moving, stuck, scattered or improving",
  "bottlenecks": "main things slowing the user down",
  "opportunities": "opportunities to improve outcomes",
  "recommended_changes": "specific changes the user should make",
  "suggested_actions": [
    {
      "title": "action title",
      "description": "action description",
      "priority": "Low | Medium | High",
      "type": "task | review | idea | habit | decision"
    }
  ]
}`

export interface WeeklyReviewSummary {
  weekStart: string
  weekEnd: string
  summary: string
  nextWeekFocus: string
  createdAt: string
}

export interface PatternAnalysisContextInput {
  projects: Project[]
  ideas: Idea[]
  tasks: Task[]
  decisions: Decision[]
  risks: Risk[]
  projectReviews: ProjectReviewSummary[]
  weeklyReviews: WeeklyReviewSummary[]
  projectDnaSummaries: ProjectDnaSummary[]
  linkedMemorySummaries: string[]
  fileSummaries: string[]
  dataCounts: PatternDataCounts
}

export interface PatternDataCounts {
  projects: number
  activeProjects: number
  tasks: number
  openTasks: number
  doneTasks: number
  ideas: number
  decisions: number
  risks: number
  openRisks: number
  projectReviews: number
  weeklyReviews: number
  dnaProfiles: number
  files: number
}

export function computeDataSufficiency(counts: PatternDataCounts): {
  level: 'low' | 'medium' | 'high'
  label: string
  score: number
} {
  const score =
    Math.min(counts.projects, 5) * 4 +
    Math.min(counts.tasks, 30) +
    Math.min(counts.decisions, 10) * 2 +
    Math.min(counts.risks, 10) * 2 +
    Math.min(counts.projectReviews, 5) * 4 +
    Math.min(counts.dnaProfiles, 3) * 5 +
    Math.min(counts.weeklyReviews, 3) * 3

  if (score < 25) {
    return { level: 'low', label: 'Early observations only', score }
  }
  if (score < 60) {
    return { level: 'medium', label: 'Growing accuracy', score }
  }
  return { level: 'high', label: 'Strong data coverage', score }
}

export function renderPatternAnalysisContext(input: PatternAnalysisContextInput): string {
  const {
    projects, ideas, tasks, decisions, risks, projectReviews, weeklyReviews,
    projectDnaSummaries, linkedMemorySummaries, fileSummaries, dataCounts,
  } = input

  const list = <T,>(items: T[], fmt: (item: T) => string, empty: string) =>
    items.length ? items.map(i => `  - ${fmt(i)}`).join('\n') : `  (${empty})`

  const projectMap = new Map(projects.map(p => [p.id, p.title]))
  const activeProjects = projects.filter(p => p.status !== 'archived')
  const openTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const openRisks = risks.filter(r => r.status === 'open')

  return `Analyse cross-project patterns across this user's entire FounderOS workspace. Use ONLY the data below.

DATA SUFFICIENCY
  Projects: ${dataCounts.projects} (${dataCounts.activeProjects} active)
  Tasks: ${dataCounts.tasks} (${dataCounts.openTasks} open, ${dataCounts.doneTasks} done)
  Ideas: ${dataCounts.ideas}
  Decisions: ${dataCounts.decisions}
  Risks: ${dataCounts.risks} (${dataCounts.openRisks} open)
  Project reviews: ${dataCounts.projectReviews}
  Weekly reviews: ${dataCounts.weeklyReviews}
  Project DNA profiles: ${dataCounts.dnaProfiles}
  Files: ${dataCounts.files}

ACTIVE PROJECTS (${activeProjects.length})
${list(activeProjects.slice(0, 15), p =>
  `[id: ${p.id}] ${p.title} — ${p.status}, ${p.priority}, ${p.progress}% progress`,
  'no active projects')}

TASK PATTERNS (${tasks.length} total)
  Open: ${openTasks.length} · Done: ${doneTasks.length}
${list(openTasks.slice(0, 20), t =>
  `[${projectMap.get(t.projectId) ?? t.projectId}] ${t.title} [${t.priority}, ${t.status}]`,
  'no open tasks')}

IDEAS (${ideas.length})
${list(ideas.slice(0, 12), i =>
  `[id: ${i.id}] ${i.title} — ${i.status}, potential ${i.potentialScore}/10`,
  'no ideas')}

DECISIONS (${decisions.length})
${list(decisions.slice(0, 12), d =>
  `[${projectMap.get(d.projectId) ?? d.projectId}] ${d.decision.slice(0, 120)}`,
  'no decisions')}

OPEN RISKS (${openRisks.length})
${list(openRisks.slice(0, 12), r =>
  `[${projectMap.get(r.projectId) ?? r.projectId}] ${r.title} [${r.severity}]`,
  'no open risks')}

PROJECT REVIEWS (${projectReviews.length})
${list(projectReviews.slice(0, 8), r =>
  `[${r.projectTitle}] ${r.summary.replace(/\s+/g, ' ').slice(0, 140)}`,
  'no project reviews')}

WEEKLY REVIEWS (${weeklyReviews.length})
${list(weeklyReviews.slice(0, 5), r =>
  `${r.weekStart}–${r.weekEnd}: ${r.summary.replace(/\s+/g, ' ').slice(0, 120)}`,
  'no weekly reviews')}

PROJECT DNA PROFILES (${projectDnaSummaries.length})
${list(projectDnaSummaries.slice(0, 10), d =>
  `[${d.projectTitle}] ${d.dnaSummary.replace(/\s+/g, ' ').slice(0, 100)} — momentum: ${d.momentumPattern.replace(/\s+/g, ' ').slice(0, 60)}`,
  'no project DNA yet')}

UPLOADED FILES (${fileSummaries.length})
${list(fileSummaries.slice(0, 8), s => s, 'no files')}

LINKED MEMORY
${list(linkedMemorySummaries.slice(0, 10), s => s, 'no linked memory')}`
}

export function toPatternSnapshot(analysis: {
  summary: string
  bottlenecks: string
  recommendedChanges: string
}): PatternAnalysisSnapshot {
  return {
    summary: analysis.summary,
    bottlenecks: analysis.bottlenecks,
    recommendedChanges: analysis.recommendedChanges,
  }
}

export function renderPatternSnapshotPrompt(snapshot: PatternAnalysisSnapshot): string {
  return `CROSS-PROJECT PATTERNS (user-level, not single project)
  Summary: ${snapshot.summary || '(none)'}
  Key bottleneck: ${snapshot.bottlenecks || '(none)'}
  Recommended change: ${snapshot.recommendedChanges || '(none)'}`
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

const PRIORITIES = ['Low', 'Medium', 'High'] as const
const ACTION_TYPES = ['task', 'review', 'idea', 'habit', 'decision'] as const

export function normalizeSuggestedPatternActions(raw: unknown): SuggestedPatternAction[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): SuggestedPatternAction | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const title = str(o.title)
      if (!title) return null
      const p = str(o.priority)
      const priority = (PRIORITIES as readonly string[]).includes(p)
        ? (p as SuggestedPatternAction['priority'])
        : 'Medium'
      const t = str(o.type).toLowerCase()
      const type = (ACTION_TYPES as readonly string[]).includes(t)
        ? (t as SuggestedPatternAction['type'])
        : 'task'
      return { title, description: str(o.description), priority, type }
    })
    .filter((a): a is SuggestedPatternAction => a !== null)
    .slice(0, 10)
}

export interface NormalizedPatternAnalysisFields {
  summary: string
  recurringStrengths: string
  recurringWeaknesses: string
  executionPatterns: string
  ideaPatterns: string
  riskPatterns: string
  decisionPatterns: string
  projectMomentumPatterns: string
  bottlenecks: string
  opportunities: string
  recommendedChanges: string
  suggestedActions: SuggestedPatternAction[]
}

export function normalizePatternAnalysis(raw: unknown): NormalizedPatternAnalysisFields {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Pattern analysis did not return an object')
  }
  const o = raw as Record<string, unknown>
  return {
    summary:                   str(o.summary),
    recurringStrengths:        str(o.recurring_strengths),
    recurringWeaknesses:       str(o.recurring_weaknesses),
    executionPatterns:         str(o.execution_patterns),
    ideaPatterns:              str(o.idea_patterns),
    riskPatterns:              str(o.risk_patterns),
    decisionPatterns:          str(o.decision_patterns),
    projectMomentumPatterns:   str(o.project_momentum_patterns),
    bottlenecks:               str(o.bottlenecks),
    opportunities:             str(o.opportunities),
    recommendedChanges:        str(o.recommended_changes),
    suggestedActions:          normalizeSuggestedPatternActions(o.suggested_actions),
  }
}
