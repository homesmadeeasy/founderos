/**
 * Global Command Bar — types and helpers.
 *
 * Safe for the client — contains NO secrets.
 * Search runs against AppContext data already loaded via RLS-scoped queries.
 */

import type { AppState, WeeklyReview, ProjectDna, PatternAnalysis } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommandObjectType =
  | 'project'
  | 'idea'
  | 'task'
  | 'note'
  | 'decision'
  | 'risk'
  | 'roadmap_item'
  | 'project_file'
  | 'weekly_review'
  | 'project_dna'
  | 'pattern_analysis'
  | 'goal'

export type CommandCreateType =
  | 'project'
  | 'goal'
  | 'idea'
  | 'task'
  | 'note'
  | 'decision'
  | 'risk'
  | 'roadmap_item'

export type CommandActionKind = 'navigate' | 'create' | 'recent'

export interface CommandSearchResult {
  id: string
  objectType: CommandObjectType
  title: string
  preview: string
  projectId?: string
  projectName?: string
  href: string
}

export interface CommandAction {
  id: string
  kind: CommandActionKind
  label: string
  description?: string
  href?: string
  createType?: CommandCreateType
  /** Extra strings used when filtering by query. */
  keywords?: string[]
}

export interface ParsedCreateCommand {
  createType: CommandCreateType
  text: string
}

export interface ParsedAskMemoryCommand {
  question: string
}

export interface CreateDraft {
  createType: CommandCreateType
  title: string
  description: string
  /** decision body */
  decision?: string
  reasoning?: string
  /** note body */
  content?: string
  stage?: string
}

// ─── Display labels ───────────────────────────────────────────────────────────

export const OBJECT_TYPE_LABEL: Record<CommandObjectType, string> = {
  project: 'Project',
  idea: 'Idea',
  task: 'Task',
  note: 'Note',
  decision: 'Decision',
  risk: 'Risk',
  roadmap_item: 'Roadmap item',
  project_file: 'File',
  weekly_review: 'Weekly Review',
  project_dna: 'Project DNA',
  pattern_analysis: 'Pattern Analysis',
  goal: 'Goal',
}

export const CREATE_TYPE_LABEL: Record<CommandCreateType, string> = {
  project: 'New project',
  goal: 'New goal',
  idea: 'New idea',
  task: 'New task',
  note: 'New note',
  decision: 'New decision',
  risk: 'New risk',
  roadmap_item: 'New roadmap item',
}

// ─── Route helpers ────────────────────────────────────────────────────────────

/** Extract project id when the user is on a /projects/[id] route. */
export function parseProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/)
  if (!match) return null
  const id = match[1]
  if (id === 'projects') return null
  return id
}

export function buildProjectMap(state: AppState): Map<string, string> {
  return new Map(state.projects.map(p => [p.id, p.title]))
}

// ─── Navigation actions ───────────────────────────────────────────────────────

export function buildNavigationActions(projectId: string | null): CommandAction[] {
  const global: CommandAction[] = [
    { id: 'nav-dashboard', kind: 'navigate', label: 'Command Center', href: '/dashboard', keywords: ['home', 'life hub', 'command centre', 'command center', 'today'] },
    { id: 'nav-inbox', kind: 'navigate', label: 'Inbox', href: '/inbox', keywords: ['inbox', 'capture', 'unprocessed'] },
    { id: 'nav-signals', kind: 'navigate', label: 'Signals', href: '/signals', keywords: ['signals', 'connected reality', 'calendar', 'health', 'github', 'reality'] },
    { id: 'nav-morning', kind: 'navigate', label: 'Morning Execution', href: '/morning', keywords: ['morning', 'daily plan', 'execution', 'start day', 'first action'] },
    { id: 'nav-evening', kind: 'navigate', label: 'Evening Review', href: '/evening', keywords: ['evening', 'review', 'close loop', 'end day', 'reflection', 'lessons'] },
    { id: 'nav-objects', kind: 'navigate', label: 'Object Engine', href: '/objects', keywords: ['objects', 'memory', 'graph', 'founder objects'] },
    { id: 'nav-memory-engine', kind: 'navigate', label: 'Memory Engine', href: '/memory', keywords: ['memory', 'history', 'timeline', 'remember'] },
    { id: 'nav-knowledge-engine', kind: 'navigate', label: 'Knowledge Engine', href: '/knowledge', keywords: ['knowledge', 'principles', 'rules', 'lessons', 'playbooks', 'learned'] },
    { id: 'nav-executive-engine', kind: 'navigate', label: 'Executive Engine', href: '/executive', keywords: ['executive', 'focus', 'priority', 'briefing', 'decisions', 'what matters'] },
    { id: 'nav-goals', kind: 'navigate', label: 'Goals', href: '/goals', keywords: ['goal', 'outcomes', 'objectives'] },
    { id: 'nav-projects', kind: 'navigate', label: 'Worlds', href: '/projects', keywords: ['project list', 'worlds'] },
    { id: 'nav-ideas', kind: 'navigate', label: 'Idea Vault', href: '/ideas', keywords: ['ideas', 'vault'] },
    { id: 'nav-weekly-review', kind: 'navigate', label: 'Weekly Review', href: '/weekly-review', keywords: ['review', 'weekly', 'summary'] },
    { id: 'nav-patterns', kind: 'navigate', label: 'Patterns', href: '/patterns', keywords: ['pattern', 'cross-project', 'analysis', 'insights'] },
    { id: 'nav-memory-search', kind: 'navigate', label: 'Memory Search', href: '/memory-search', keywords: ['semantic', 'search', 'ask memory', 'vector', 'recall'] },
    { id: 'nav-how-it-works', kind: 'navigate', label: 'How FounderOS works', href: '/how-it-works', keywords: ['help', 'guide', 'onboarding', 'tutorial'] },
    { id: 'nav-settings', kind: 'navigate', label: 'Settings', href: '/settings', keywords: ['preferences'] },
  ]

  if (!projectId) return global

  const base = `/projects/${projectId}`
  const projectNav: CommandAction[] = [
    { id: 'nav-proj-overview', kind: 'navigate', label: 'Project overview', href: base, keywords: ['current project'] },
    { id: 'nav-proj-chat', kind: 'navigate', label: 'Project chat', href: `${base}/chat`, keywords: ['ai', 'assistant'] },
    { id: 'nav-proj-tasks', kind: 'navigate', label: 'Project tasks', href: `${base}/tasks` },
    { id: 'nav-proj-notes', kind: 'navigate', label: 'Project notes', href: `${base}/notes` },
    { id: 'nav-proj-decisions', kind: 'navigate', label: 'Project decisions', href: `${base}/decisions` },
    { id: 'nav-proj-risks', kind: 'navigate', label: 'Project risks', href: `${base}/risks` },
    { id: 'nav-proj-roadmap', kind: 'navigate', label: 'Project roadmap', href: `${base}/roadmap` },
    { id: 'nav-proj-review', kind: 'navigate', label: 'Project review', href: `${base}/review` },
    { id: 'nav-proj-dna', kind: 'navigate', label: 'Project DNA', href: `${base}/dna`, keywords: ['dna', 'profile', 'identity'] },
    { id: 'nav-proj-memory', kind: 'navigate', label: 'Memory graph', href: `${base}/memory`, keywords: ['linked memory', 'knowledge graph'] },
    { id: 'nav-proj-memory-search', kind: 'navigate', label: 'Project memory search', href: `${base}/memory-search`, keywords: ['semantic', 'ask memory', 'search'] },
    { id: 'nav-proj-files', kind: 'navigate', label: 'Project files', href: `${base}/files`, keywords: ['upload', 'documents'] },
  ]

  return [...global, ...projectNav]
}

export function buildCreateActions(projectId: string | null): CommandAction[] {
  const global: CommandAction[] = [
    { id: 'create-goal', kind: 'create', label: CREATE_TYPE_LABEL.goal, createType: 'goal', keywords: ['new goal', 'objective'] },
    { id: 'create-idea', kind: 'create', label: CREATE_TYPE_LABEL.idea, createType: 'idea', keywords: ['capture idea'] },
    { id: 'create-project', kind: 'create', label: CREATE_TYPE_LABEL.project, createType: 'project', keywords: ['start project', 'create world'] },
  ]

  if (!projectId) return global

  return [
    ...global,
    { id: 'create-task', kind: 'create', label: CREATE_TYPE_LABEL.task, createType: 'task' },
    { id: 'create-note', kind: 'create', label: CREATE_TYPE_LABEL.note, createType: 'note' },
    { id: 'create-decision', kind: 'create', label: CREATE_TYPE_LABEL.decision, createType: 'decision' },
    { id: 'create-risk', kind: 'create', label: CREATE_TYPE_LABEL.risk, createType: 'risk' },
    { id: 'create-roadmap', kind: 'create', label: CREATE_TYPE_LABEL.roadmap_item, createType: 'roadmap_item' },
  ]
}

// ─── Recent items ─────────────────────────────────────────────────────────────

export function buildRecentSearchResults(state: AppState, projectMap: Map<string, string>): CommandSearchResult[] {
  const recentProjects = [...state.projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3)
    .map(p => ({
      id: p.id,
      objectType: 'project' as const,
      title: p.title,
      preview: p.description || p.goal || 'Project',
      href: `/projects/${p.id}`,
    }))

  const recentIdeas = [...state.ideas]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3)
    .map(i => ({
      id: i.id,
      objectType: 'idea' as const,
      title: i.title,
      preview: i.description || i.status,
      href: `/ideas/${i.id}`,
    }))

  const recentTasks = [...state.tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map(t => ({
      id: t.id,
      objectType: 'task' as const,
      title: t.title,
      preview: t.description || t.status,
      projectId: t.projectId,
      projectName: projectMap.get(t.projectId),
      href: `/projects/${t.projectId}/tasks`,
    }))

  return [...recentProjects, ...recentIdeas, ...recentTasks]
}

// ─── Search ───────────────────────────────────────────────────────────────────

function matchesQuery(q: string, ...fields: (string | undefined)[]): boolean {
  return fields.some(f => f && f.toLowerCase().includes(q))
}

function filterActions(actions: CommandAction[], q: string): CommandAction[] {
  if (!q) return actions
  return actions.filter(a => {
    const haystack = [a.label, a.description, ...(a.keywords ?? [])].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

/** Client-side search across loaded app state (RLS-scoped data). */
export function searchAppData(
  state: AppState,
  query: string,
  projectMap: Map<string, string>,
  limit = 20,
): CommandSearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const results: CommandSearchResult[] = []

  for (const p of state.projects) {
    if (matchesQuery(q, p.title, p.description, p.goal)) {
      results.push({
        id: p.id,
        objectType: 'project',
        title: p.title,
        preview: p.description || p.goal || '',
        href: `/projects/${p.id}`,
      })
    }
  }

  for (const i of state.ideas) {
    if (matchesQuery(q, i.title, i.description, i.problem, i.solution, ...i.tags)) {
      results.push({
        id: i.id,
        objectType: 'idea',
        title: i.title,
        preview: i.description || i.problem || '',
        href: `/ideas/${i.id}`,
      })
    }
  }

  for (const g of state.goals) {
    if (matchesQuery(q, g.title, g.description, g.successCriteria, g.whyItMatters, g.category)) {
      results.push({
        id: g.id,
        objectType: 'goal',
        title: g.title,
        preview: g.description || g.successCriteria || g.status,
        href: `/goals/${g.id}`,
      })
    }
  }

  for (const t of state.tasks) {
    if (matchesQuery(q, t.title, t.description)) {
      results.push({
        id: t.id,
        objectType: 'task',
        title: t.title,
        preview: t.description || t.status,
        projectId: t.projectId,
        projectName: projectMap.get(t.projectId),
        href: `/projects/${t.projectId}/tasks`,
      })
    }
  }

  for (const n of state.notes) {
    if (matchesQuery(q, n.title, n.content)) {
      results.push({
        id: n.id,
        objectType: 'note',
        title: n.title,
        preview: n.content.slice(0, 120),
        projectId: n.projectId,
        projectName: projectMap.get(n.projectId),
        href: `/projects/${n.projectId}/notes`,
      })
    }
  }

  for (const d of state.decisions) {
    if (matchesQuery(q, d.decision, d.reasoning)) {
      results.push({
        id: d.id,
        objectType: 'decision',
        title: d.decision,
        preview: d.reasoning.slice(0, 120),
        projectId: d.projectId,
        projectName: projectMap.get(d.projectId),
        href: `/projects/${d.projectId}/decisions`,
      })
    }
  }

  for (const r of state.risks) {
    if (matchesQuery(q, r.title, r.description, r.mitigation)) {
      results.push({
        id: r.id,
        objectType: 'risk',
        title: r.title,
        preview: r.description || r.mitigation,
        projectId: r.projectId,
        projectName: projectMap.get(r.projectId),
        href: `/projects/${r.projectId}/risks`,
      })
    }
  }

  for (const r of state.roadmapItems) {
    if (matchesQuery(q, r.title, r.description, r.stage)) {
      results.push({
        id: r.id,
        objectType: 'roadmap_item',
        title: r.title,
        preview: r.description || r.stage,
        projectId: r.projectId,
        projectName: projectMap.get(r.projectId),
        href: `/projects/${r.projectId}/roadmap`,
      })
    }
  }

  for (const f of state.projectFiles) {
    if (matchesQuery(q, f.fileName, f.summary, f.extractedText)) {
      results.push({
        id: f.id,
        objectType: 'project_file',
        title: f.fileName,
        preview: f.summary || f.status,
        projectId: f.projectId,
        projectName: projectMap.get(f.projectId),
        href: `/projects/${f.projectId}/files`,
      })
    }
  }

  return results.slice(0, limit)
}

/** Search weekly reviews by summary and focus text. */
export function searchWeeklyReviews(
  reviews: WeeklyReview[],
  query: string,
  limit = 8,
): CommandSearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return reviews
    .filter(r =>
      r.summary.toLowerCase().includes(q) ||
      r.nextWeekFocus.toLowerCase().includes(q) ||
      r.completedWork.toLowerCase().includes(q),
    )
    .slice(0, limit)
    .map(r => ({
      id: r.id,
      objectType: 'weekly_review' as const,
      title: r.summary.slice(0, 80) || 'Weekly Review',
      preview: r.nextWeekFocus.slice(0, 120) || `${r.weekStart} – ${r.weekEnd}`,
      href: '/weekly-review',
    }))
}

/** Search project DNA profiles by summary and strategic move. */
export function searchProjectDna(
  records: ProjectDna[],
  projectMap: Map<string, string>,
  query: string,
  projectId: string | null,
  limit = 8,
): CommandSearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return records
    .filter(d => !projectId || d.projectId === projectId)
    .filter(d =>
      d.dnaSummary.toLowerCase().includes(q) ||
      d.nextStrategicMove.toLowerCase().includes(q) ||
      d.currentDirection.toLowerCase().includes(q) ||
      d.origin.toLowerCase().includes(q),
    )
    .slice(0, limit)
    .map(d => ({
      id: d.id,
      objectType: 'project_dna' as const,
      title: d.dnaSummary.slice(0, 80) || 'Project DNA',
      preview: d.nextStrategicMove.slice(0, 120) || d.currentDirection.slice(0, 120),
      projectId: d.projectId,
      projectName: projectMap.get(d.projectId),
      href: `/projects/${d.projectId}/dna`,
    }))
}

/** Search pattern analyses by summary, bottlenecks and recommendations. */
export function searchPatternAnalyses(
  analyses: PatternAnalysis[],
  query: string,
  limit = 8,
): CommandSearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return analyses
    .filter(a =>
      a.summary.toLowerCase().includes(q) ||
      a.bottlenecks.toLowerCase().includes(q) ||
      a.recommendedChanges.toLowerCase().includes(q) ||
      a.recurringStrengths.toLowerCase().includes(q) ||
      a.recurringWeaknesses.toLowerCase().includes(q),
    )
    .slice(0, limit)
    .map(a => ({
      id: a.id,
      objectType: 'pattern_analysis' as const,
      title: a.summary.slice(0, 80) || 'Pattern Analysis',
      preview: a.bottlenecks.slice(0, 120) || a.recommendedChanges.slice(0, 120),
      href: '/patterns',
    }))
}

// ─── Natural-language create commands ─────────────────────────────────────────

const CREATE_TYPE_ALIASES: Record<string, CommandCreateType> = {
  goal: 'goal',
  idea: 'idea',
  project: 'project',
  world: 'project',
  task: 'task',
  note: 'note',
  decision: 'decision',
  risk: 'risk',
  roadmap: 'roadmap_item',
  'roadmap item': 'roadmap_item',
  roadmapitem: 'roadmap_item',
}

function normalizeCreateType(raw: string): CommandCreateType | null {
  return CREATE_TYPE_ALIASES[raw.toLowerCase().replace(/\s+/g, ' ').trim()] ?? null
}

const PROJECT_ONLY_CREATES: CommandCreateType[] = ['task', 'note', 'decision', 'risk', 'roadmap_item']

/** Rule-based parsing: "ask memory: What decisions…" → question text. */
export function parseAskMemoryCommand(input: string): ParsedAskMemoryCommand | null {
  const match = input.trim().match(/^ask\s+memory\s*:\s*(.+)$/i)
  if (!match) return null
  const question = match[1].trim()
  return question ? { question } : null
}

/** Rule-based parsing: "new task: Build upload" → create draft. */
export function parseCreateCommand(input: string, inProject: boolean): ParsedCreateCommand | null {
  const trimmed = input.trim()
  const match = trimmed.match(/^(?:new|create)\s+(goal|idea|project|world|task|note|decision|risk|roadmap(?:\s*item)?)\s*:\s*(.+)$/i)
  if (!match) return null

  const createType = normalizeCreateType(match[1])
  if (!createType) return null

  const text = match[2].trim()
  if (!text) return null

  if (!inProject && PROJECT_ONLY_CREATES.includes(createType)) return null
  if (createType === 'goal' && !inProject) {
    return { createType: 'goal', text }
  }
  if (createType === 'goal') return null

  return { createType, text }
}

export function createDraftFromParsed(parsed: ParsedCreateCommand): CreateDraft {
  const { createType, text } = parsed
  if (createType === 'decision') {
    return { createType, title: text, description: '', decision: text, reasoning: '' }
  }
  if (createType === 'note') {
    return { createType, title: text, description: '', content: text }
  }
  return { createType, title: text, description: text }
}

export function emptyCreateDraft(createType: CommandCreateType): CreateDraft {
  if (createType === 'decision') {
    return { createType, title: '', description: '', decision: '', reasoning: '' }
  }
  if (createType === 'note') {
    return { createType, title: '', description: '', content: '' }
  }
  if (createType === 'roadmap_item') {
    return { createType, title: '', description: '', stage: 'Next' }
  }
  return { createType, title: '', description: '' }
}

/** Filter navigation + create actions for the current query. */
export function filterCommandPalette(
  state: AppState,
  query: string,
  projectId: string | null,
  weeklyReviews: WeeklyReview[] = [],
  projectDnaRecords: ProjectDna[] = [],
  patternAnalyses: PatternAnalysis[] = [],
): { actions: CommandAction[]; results: CommandSearchResult[]; parsed: ParsedCreateCommand | null; askMemory: ParsedAskMemoryCommand | null } {
  const q = query.trim().toLowerCase()
  const projectMap = buildProjectMap(state)
  const parsed = parseCreateCommand(query, !!projectId)
  const askMemory = parseAskMemoryCommand(query)

  const navActions = filterActions(buildNavigationActions(projectId), q)
  const createActions = filterActions(buildCreateActions(projectId), q)
  const actions = [...createActions, ...navActions]

  const results = q
    ? [
        ...searchAppData(state, query, projectMap),
        ...searchWeeklyReviews(weeklyReviews, query),
        ...searchProjectDna(projectDnaRecords, projectMap, query, projectId),
        ...searchPatternAnalyses(patternAnalyses, query),
      ]
    : []

  return { actions, results, parsed, askMemory }
}
