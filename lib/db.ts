/**
 * Data-access layer — all Supabase queries live here.
 *
 * Every function takes a SupabaseClient so it works with either the browser
 * client (client components, via AppContext) or a server client.
 *
 * Two responsibilities:
 *   1. Run the query / mutation (RLS scopes everything to the current user).
 *   2. Map snake_case DB rows ↔ the camelCase app types used across the UI.
 *
 * The app stores its own lowercase enum values ('idea', 'todo', 'open', …)
 * directly in the text columns, so no enum translation is needed.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AppState, Project, Task, Note, Decision, Risk, RoadmapItem, Message,
  ProjectReview, Idea, IdeaAnalysis, IdeaStatus,
  ProjectStatus, ProjectPriority, TaskStatus, TaskPriority,
  RiskSeverity, RiskStatus, RoadmapStatus, MessageRole,
} from './types'
import type {
  NewProject, NewTask, NewNote, NewDecision, NewRisk, NewRoadmapItem, NewIdea,
} from '@/contexts/AppContext'
import {
  normalizeSuggestedTasks, normalizeSuggestedRoadmapItems,
  type NormalizedReviewFields, type ReviewContextInput,
} from './review'
import {
  normalizeSuggestedProject, normalizeSuggestedIdeaTasks,
  normalizeSuggestedIdeaRisks, normalizeSuggestedIdeaRoadmapItems,
  type NormalizedIdeaAnalysisFields,
} from './idea'

// ─── DB row types (snake_case) ──────────────────────────────────────────────

interface ProjectRow  { id: string; title: string; description: string | null; goal: string | null; status: string; priority: string; progress: number; created_at: string; updated_at: string }
interface TaskRow     { id: string; project_id: string; title: string; description: string | null; status: string; priority: string; due_date: string | null; created_at: string }
interface NoteRow     { id: string; project_id: string; title: string; content: string | null; created_at: string }
interface DecisionRow { id: string; project_id: string; decision: string; reasoning: string | null; created_at: string }
interface RiskRow     { id: string; project_id: string; title: string; description: string | null; severity: string; mitigation: string | null; status: string; created_at: string }
interface RoadmapRow  { id: string; project_id: string; title: string; description: string | null; stage: string | null; status: string; sort_order: number; created_at: string }
interface MessageRow  { id: string; project_id: string; role: string; content: string; created_at: string }
interface ProjectReviewRow {
  id: string; project_id: string
  summary: string | null; progress_review: string | null; completed_work: string | null
  blockers: string | null; key_risks: string | null; key_decisions: string | null
  next_7_day_plan: string | null; suggested_tasks: unknown; suggested_roadmap_items: unknown
  created_at: string
}
interface IdeaRow {
  id: string; title: string; description: string | null; target_user: string | null
  problem: string | null; solution: string | null; potential_score: number | null
  difficulty_score: number | null; status: string; tags: string[] | null
  created_at: string; updated_at: string
}
interface IdeaAnalysisRow {
  id: string; idea_id: string
  summary: string | null; target_user_analysis: string | null; problem_analysis: string | null
  market_potential: string | null; difficulty_analysis: string | null; risks: string | null
  mvp_suggestion: string | null; validation_plan: string | null; next_steps: string | null
  suggested_project: unknown; suggested_tasks: unknown; suggested_risks: unknown
  suggested_roadmap_items: unknown; created_at: string
}

// ─── Row → app mappers ──────────────────────────────────────────────────────

const toProject = (r: ProjectRow): Project => ({
  id: r.id, title: r.title, description: r.description ?? '', goal: r.goal ?? '',
  status: r.status as ProjectStatus, priority: r.priority as ProjectPriority,
  progress: r.progress ?? 0, createdAt: r.created_at, updatedAt: r.updated_at,
})

const toTask = (r: TaskRow): Task => ({
  id: r.id, projectId: r.project_id, title: r.title, description: r.description ?? '',
  status: r.status as TaskStatus, priority: r.priority as TaskPriority,
  dueDate: r.due_date ?? undefined, createdAt: r.created_at,
})

const toNote = (r: NoteRow): Note => ({
  id: r.id, projectId: r.project_id, title: r.title, content: r.content ?? '', createdAt: r.created_at,
})

const toDecision = (r: DecisionRow): Decision => ({
  id: r.id, projectId: r.project_id, decision: r.decision, reasoning: r.reasoning ?? '', createdAt: r.created_at,
})

const toRisk = (r: RiskRow): Risk => ({
  id: r.id, projectId: r.project_id, title: r.title, description: r.description ?? '',
  severity: r.severity as RiskSeverity, mitigation: r.mitigation ?? '',
  status: r.status as RiskStatus, createdAt: r.created_at,
})

const toRoadmap = (r: RoadmapRow): RoadmapItem => ({
  id: r.id, projectId: r.project_id, title: r.title, description: r.description ?? '',
  stage: r.stage ?? '', status: r.status as RoadmapStatus, sortOrder: r.sort_order ?? 0, createdAt: r.created_at,
})

const toMessage = (r: MessageRow): Message => ({
  id: r.id, role: r.role as MessageRole, content: r.content, createdAt: r.created_at,
})

const toIdea = (r: IdeaRow): Idea => ({
  id: r.id, title: r.title, description: r.description ?? '',
  targetUser: r.target_user ?? '', problem: r.problem ?? '', solution: r.solution ?? '',
  potentialScore: r.potential_score ?? 5, difficultyScore: r.difficulty_score ?? 5,
  status: r.status as IdeaStatus, tags: r.tags ?? [],
  createdAt: r.created_at, updatedAt: r.updated_at,
})

const toIdeaAnalysis = (r: IdeaAnalysisRow): IdeaAnalysis => ({
  id: r.id, ideaId: r.idea_id,
  summary: r.summary ?? '', targetUserAnalysis: r.target_user_analysis ?? '',
  problemAnalysis: r.problem_analysis ?? '', marketPotential: r.market_potential ?? '',
  difficultyAnalysis: r.difficulty_analysis ?? '', risks: r.risks ?? '',
  mvpSuggestion: r.mvp_suggestion ?? '', validationPlan: r.validation_plan ?? '',
  nextSteps: r.next_steps ?? '',
  suggestedProject:      normalizeSuggestedProject(r.suggested_project),
  suggestedTasks:        normalizeSuggestedIdeaTasks(r.suggested_tasks),
  suggestedRisks:        normalizeSuggestedIdeaRisks(r.suggested_risks),
  suggestedRoadmapItems: normalizeSuggestedIdeaRoadmapItems(r.suggested_roadmap_items),
  createdAt: r.created_at,
})

const toProjectReview = (r: ProjectReviewRow): ProjectReview => ({
  id: r.id, projectId: r.project_id,
  summary: r.summary ?? '', progressReview: r.progress_review ?? '',
  completedWork: r.completed_work ?? '', blockers: r.blockers ?? '',
  keyRisks: r.key_risks ?? '', keyDecisions: r.key_decisions ?? '',
  next7DayPlan: r.next_7_day_plan ?? '',
  suggestedTasks: normalizeSuggestedTasks(r.suggested_tasks),
  suggestedRoadmapItems: normalizeSuggestedRoadmapItems(r.suggested_roadmap_items),
  createdAt: r.created_at,
})

// ─── Load everything for the signed-in user ───────────────────────────────────

export async function loadAppState(supabase: SupabaseClient): Promise<AppState> {
  const [projects, tasks, notes, decisions, risks, roadmap, messages, ideas] = await Promise.all([
    supabase.from('projects').select('*').order('updated_at', { ascending: false }),
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('notes').select('*').order('created_at', { ascending: false }),
    supabase.from('decisions').select('*').order('created_at', { ascending: false }),
    supabase.from('risks').select('*').order('created_at', { ascending: false }),
    supabase.from('roadmap_items').select('*').order('sort_order', { ascending: true }),
    supabase.from('messages').select('*').order('created_at', { ascending: true }),
    supabase.from('ideas').select('*').order('updated_at', { ascending: false }),
  ])

  const firstError = projects.error || tasks.error || notes.error || decisions.error
    || risks.error || roadmap.error || messages.error || ideas.error
  if (firstError) throw firstError

  // Group messages by project
  const chatMessages: Record<string, Message[]> = {}
  for (const row of (messages.data ?? []) as MessageRow[]) {
    ;(chatMessages[row.project_id] ??= []).push(toMessage(row))
  }

  return {
    projects:     (projects.data  ?? []).map(toProject),
    tasks:        (tasks.data     ?? []).map(toTask),
    notes:        (notes.data     ?? []).map(toNote),
    decisions:    (decisions.data ?? []).map(toDecision),
    risks:        (risks.data     ?? []).map(toRisk),
    roadmapItems: (roadmap.data   ?? []).map(toRoadmap),
    ideas:        (ideas.data     ?? []).map(toIdea),
    chatMessages,
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProject(supabase: SupabaseClient, userId: string, d: NewProject): Promise<Project> {
  const { data, error } = await supabase.from('projects').insert({
    user_id: userId, title: d.title, description: d.description, goal: d.goal,
    status: d.status, priority: d.priority, progress: d.progress,
  }).select('*').single()
  if (error) throw error
  return toProject(data as ProjectRow)
}

export async function updateProject(supabase: SupabaseClient, id: string, d: Partial<Omit<Project, 'id' | 'createdAt'>>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.title       !== undefined) patch.title = d.title
  if (d.description !== undefined) patch.description = d.description
  if (d.goal        !== undefined) patch.goal = d.goal
  if (d.status      !== undefined) patch.status = d.status
  if (d.priority    !== undefined) patch.priority = d.priority
  if (d.progress    !== undefined) patch.progress = d.progress
  const { error } = await supabase.from('projects').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteProject(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export async function createTask(supabase: SupabaseClient, userId: string, d: NewTask): Promise<Task> {
  const { data, error } = await supabase.from('tasks').insert({
    user_id: userId, project_id: d.projectId, title: d.title, description: d.description,
    status: d.status, priority: d.priority, due_date: d.dueDate ?? null,
    source_message_id: d.sourceMessageId ?? null,
  }).select('*').single()
  if (error) throw error
  return toTask(data as TaskRow)
}

export async function updateTask(supabase: SupabaseClient, id: string, d: Partial<Task>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.title       !== undefined) patch.title = d.title
  if (d.description !== undefined) patch.description = d.description
  if (d.status      !== undefined) patch.status = d.status
  if (d.priority    !== undefined) patch.priority = d.priority
  if (d.dueDate     !== undefined) patch.due_date = d.dueDate
  const { error } = await supabase.from('tasks').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteTask(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ─── Notes ──────────────────────────────────────────────────────────────────

export async function createNote(supabase: SupabaseClient, userId: string, d: NewNote): Promise<Note> {
  const { data, error } = await supabase.from('notes').insert({
    user_id: userId, project_id: d.projectId, title: d.title, content: d.content,
    source_message_id: d.sourceMessageId ?? null,
  }).select('*').single()
  if (error) throw error
  return toNote(data as NoteRow)
}

export async function deleteNote(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}

// ─── Decisions ────────────────────────────────────────────────────────────────

export async function createDecision(supabase: SupabaseClient, userId: string, d: NewDecision): Promise<Decision> {
  const { data, error } = await supabase.from('decisions').insert({
    user_id: userId, project_id: d.projectId, decision: d.decision, reasoning: d.reasoning,
    source_message_id: d.sourceMessageId ?? null,
  }).select('*').single()
  if (error) throw error
  return toDecision(data as DecisionRow)
}

export async function deleteDecision(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('decisions').delete().eq('id', id)
  if (error) throw error
}

// ─── Risks ──────────────────────────────────────────────────────────────────

export async function createRisk(supabase: SupabaseClient, userId: string, d: NewRisk): Promise<Risk> {
  const { data, error } = await supabase.from('risks').insert({
    user_id: userId, project_id: d.projectId, title: d.title, description: d.description,
    severity: d.severity, mitigation: d.mitigation, status: d.status,
  }).select('*').single()
  if (error) throw error
  return toRisk(data as RiskRow)
}

export async function updateRisk(supabase: SupabaseClient, id: string, d: Partial<Risk>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.title       !== undefined) patch.title = d.title
  if (d.description !== undefined) patch.description = d.description
  if (d.severity    !== undefined) patch.severity = d.severity
  if (d.mitigation  !== undefined) patch.mitigation = d.mitigation
  if (d.status      !== undefined) patch.status = d.status
  const { error } = await supabase.from('risks').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteRisk(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('risks').delete().eq('id', id)
  if (error) throw error
}

// ─── Roadmap ──────────────────────────────────────────────────────────────────

export async function createRoadmapItem(supabase: SupabaseClient, userId: string, d: NewRoadmapItem): Promise<RoadmapItem> {
  const { data, error } = await supabase.from('roadmap_items').insert({
    user_id: userId, project_id: d.projectId, title: d.title, description: d.description,
    stage: d.stage, status: d.status, sort_order: d.sortOrder,
  }).select('*').single()
  if (error) throw error
  return toRoadmap(data as RoadmapRow)
}

export async function updateRoadmapItem(supabase: SupabaseClient, id: string, d: Partial<RoadmapItem>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.title       !== undefined) patch.title = d.title
  if (d.description !== undefined) patch.description = d.description
  if (d.stage       !== undefined) patch.stage = d.stage
  if (d.status      !== undefined) patch.status = d.status
  if (d.sortOrder   !== undefined) patch.sort_order = d.sortOrder
  const { error } = await supabase.from('roadmap_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteRoadmapItem(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('roadmap_items').delete().eq('id', id)
  if (error) throw error
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function createMessage(
  supabase: SupabaseClient, userId: string, projectId: string, role: MessageRole, content: string,
): Promise<Message> {
  const { data, error } = await supabase.from('messages').insert({
    user_id: userId, project_id: projectId, role, content,
  }).select('*').single()
  if (error) throw error
  return toMessage(data as MessageRow)
}

// ─── Project context (server-side, for review generation) ────────────────────

/**
 * Fetch a single project plus all of its related data, mapped to app types.
 * Returns null if the project doesn't exist or isn't visible to the caller
 * (RLS scopes everything to the signed-in user). Used by /api/project-review.
 */
export async function loadProjectContext(
  supabase: SupabaseClient, projectId: string,
): Promise<ReviewContextInput | null> {
  const { data: projectData, error: projectError } = await supabase
    .from('projects').select('*').eq('id', projectId).maybeSingle()
  if (projectError) throw projectError
  if (!projectData) return null

  const [tasks, notes, decisions, risks, roadmap, messages] = await Promise.all([
    supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('decisions').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('risks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('roadmap_items').select('*').eq('project_id', projectId).order('sort_order', { ascending: true }),
    supabase.from('messages').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
  ])

  const firstError = tasks.error || notes.error || decisions.error || risks.error || roadmap.error || messages.error
  if (firstError) throw firstError

  return {
    project:      toProject(projectData as ProjectRow),
    tasks:        (tasks.data    ?? []).map(toTask),
    notes:        (notes.data    ?? []).map(toNote),
    decisions:    (decisions.data ?? []).map(toDecision),
    risks:        (risks.data    ?? []).map(toRisk),
    roadmapItems: (roadmap.data  ?? []).map(toRoadmap),
    messages:     (messages.data ?? []).map(toMessage),
  }
}

// ─── Project Reviews ──────────────────────────────────────────────────────────

/** Load every review for a project, newest first. RLS scopes to the owner. */
export async function loadProjectReviews(supabase: SupabaseClient, projectId: string): Promise<ProjectReview[]> {
  const { data, error } = await supabase
    .from('project_reviews')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toProjectReview(r as ProjectReviewRow))
}

/** Insert a generated review and return the saved, mapped row. */
export async function createProjectReview(
  supabase: SupabaseClient, userId: string, projectId: string, fields: NormalizedReviewFields,
): Promise<ProjectReview> {
  const { data, error } = await supabase.from('project_reviews').insert({
    user_id: userId,
    project_id: projectId,
    summary: fields.summary,
    progress_review: fields.progressReview,
    completed_work: fields.completedWork,
    blockers: fields.blockers,
    key_risks: fields.keyRisks,
    key_decisions: fields.keyDecisions,
    next_7_day_plan: fields.next7DayPlan,
    suggested_tasks: fields.suggestedTasks,
    suggested_roadmap_items: fields.suggestedRoadmapItems,
  }).select('*').single()
  if (error) throw error
  return toProjectReview(data as ProjectReviewRow)
}

// ─── Ideas ────────────────────────────────────────────────────────────────────

export async function createIdea(supabase: SupabaseClient, userId: string, d: NewIdea): Promise<Idea> {
  const { data, error } = await supabase.from('ideas').insert({
    user_id: userId, title: d.title, description: d.description,
    target_user: d.targetUser, problem: d.problem, solution: d.solution,
    potential_score: d.potentialScore, difficulty_score: d.difficultyScore,
    status: d.status, tags: d.tags,
  }).select('*').single()
  if (error) throw error
  return toIdea(data as IdeaRow)
}

export async function updateIdea(supabase: SupabaseClient, id: string, d: Partial<Omit<Idea, 'id' | 'createdAt'>>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.title           !== undefined) patch.title = d.title
  if (d.description     !== undefined) patch.description = d.description
  if (d.targetUser      !== undefined) patch.target_user = d.targetUser
  if (d.problem         !== undefined) patch.problem = d.problem
  if (d.solution        !== undefined) patch.solution = d.solution
  if (d.potentialScore  !== undefined) patch.potential_score = d.potentialScore
  if (d.difficultyScore !== undefined) patch.difficulty_score = d.difficultyScore
  if (d.status          !== undefined) patch.status = d.status
  if (d.tags            !== undefined) patch.tags = d.tags
  const { error } = await supabase.from('ideas').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteIdea(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('ideas').delete().eq('id', id)
  if (error) throw error
}

// ─── Idea Analyses ──────────────────────────────────────────────────────────────

/** Fetch a single idea (server-side, for analysis). RLS scopes to the owner. */
export async function loadIdea(supabase: SupabaseClient, ideaId: string): Promise<Idea | null> {
  const { data, error } = await supabase.from('ideas').select('*').eq('id', ideaId).maybeSingle()
  if (error) throw error
  return data ? toIdea(data as IdeaRow) : null
}

/** Load every analysis for an idea, newest first. */
export async function loadIdeaAnalyses(supabase: SupabaseClient, ideaId: string): Promise<IdeaAnalysis[]> {
  const { data, error } = await supabase
    .from('idea_analyses')
    .select('*')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toIdeaAnalysis(r as IdeaAnalysisRow))
}

/** Insert a generated analysis and return the saved, mapped row. */
export async function createIdeaAnalysis(
  supabase: SupabaseClient, userId: string, ideaId: string, fields: NormalizedIdeaAnalysisFields,
): Promise<IdeaAnalysis> {
  const { data, error } = await supabase.from('idea_analyses').insert({
    user_id: userId,
    idea_id: ideaId,
    summary: fields.summary,
    target_user_analysis: fields.targetUserAnalysis,
    problem_analysis: fields.problemAnalysis,
    market_potential: fields.marketPotential,
    difficulty_analysis: fields.difficultyAnalysis,
    risks: fields.risks,
    mvp_suggestion: fields.mvpSuggestion,
    validation_plan: fields.validationPlan,
    next_steps: fields.nextSteps,
    suggested_project: fields.suggestedProject,
    suggested_tasks: fields.suggestedTasks,
    suggested_risks: fields.suggestedRisks,
    suggested_roadmap_items: fields.suggestedRoadmapItems,
  }).select('*').single()
  if (error) throw error
  return toIdeaAnalysis(data as IdeaAnalysisRow)
}
