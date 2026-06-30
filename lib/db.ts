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
  ProjectReview, Idea, IdeaAnalysis, IdeaStatus, Link, EntityType, ProjectFile, FileStatus,
  ProjectStatus, ProjectPriority, TaskStatus, TaskPriority,
  RiskSeverity, RiskStatus, RoadmapStatus, MessageRole, WeeklyReview, ProjectDna, PatternAnalysis,
} from './types'
import type {
  NewProject, NewTask, NewNote, NewDecision, NewRisk, NewRoadmapItem, NewIdea, NewLink, NewProjectFile,
} from '@/contexts/AppContext'
import {
  normalizeSuggestedTasks, normalizeSuggestedRoadmapItems,
  type NormalizedReviewFields, type ReviewContextInput,
} from './review'
import {
  normalizeSuggestedWeeklyTasks, normalizeSuggestedProjectReviews,
  getWeekBounds, type NormalizedWeeklyReviewFields, type WeeklyReviewContextInput,
} from './weekly-review'
import {
  type NormalizedProjectDnaFields, type ProjectDnaContextInput, type IdeaOriginContext,
} from './project-dna'
import {
  normalizeSuggestedPatternActions,
  type NormalizedPatternAnalysisFields, type PatternAnalysisContextInput, type PatternDataCounts,
  type WeeklyReviewSummary,
} from './pattern-analysis'
import { buildLabelResolver, summarizeLinks, collectProjectEntityIds, getProjectLinks } from './links'
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
interface LinkRow {
  id: string; source_type: string; source_id: string; target_type: string; target_id: string
  relationship_type: string; description: string | null; created_at: string
}
interface ProjectFileRow {
  id: string; project_id: string; file_name: string; file_path: string; file_type: string | null
  file_size: number | null; summary: string | null; extracted_text: string | null
  status: string; created_at: string; updated_at: string
}
interface WeeklyReviewRow {
  id: string; week_start: string; week_end: string
  summary: string | null; completed_work: string | null; active_projects: string | null
  stuck_projects: string | null; key_decisions: string | null; key_risks: string | null
  ideas_to_revisit: string | null; files_added: string | null; memory_insights: string | null
  next_week_focus: string | null; suggested_tasks: unknown; suggested_project_reviews: unknown
  created_at: string
}
interface ProjectDnaRow {
  id: string; project_id: string
  origin: string | null; core_goal: string | null; current_direction: string | null
  major_decisions: string | null; recurring_risks: string | null; momentum_pattern: string | null
  lessons_learned: string | null; next_strategic_move: string | null; dna_summary: string | null
  confidence_score: number | null; created_at: string
}
interface PatternAnalysisRow {
  id: string
  summary: string | null; recurring_strengths: string | null; recurring_weaknesses: string | null
  execution_patterns: string | null; idea_patterns: string | null; risk_patterns: string | null
  decision_patterns: string | null; project_momentum_patterns: string | null
  bottlenecks: string | null; opportunities: string | null; recommended_changes: string | null
  suggested_actions: unknown; created_at: string
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

const toLink = (r: LinkRow): Link => ({
  id: r.id,
  sourceType: r.source_type as EntityType, sourceId: r.source_id,
  targetType: r.target_type as EntityType, targetId: r.target_id,
  relationshipType: r.relationship_type as Link['relationshipType'],
  description: r.description ?? '', createdAt: r.created_at,
})

const toProjectFile = (r: ProjectFileRow): ProjectFile => ({
  id: r.id, projectId: r.project_id, fileName: r.file_name, filePath: r.file_path,
  fileType: r.file_type ?? '', fileSize: r.file_size ?? 0,
  summary: r.summary ?? '', extractedText: r.extracted_text ?? '',
  status: r.status as FileStatus, createdAt: r.created_at, updatedAt: r.updated_at,
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

const toWeeklyReview = (r: WeeklyReviewRow): WeeklyReview => ({
  id: r.id,
  weekStart: r.week_start,
  weekEnd: r.week_end,
  summary: r.summary ?? '',
  completedWork: r.completed_work ?? '',
  activeProjects: r.active_projects ?? '',
  stuckProjects: r.stuck_projects ?? '',
  keyDecisions: r.key_decisions ?? '',
  keyRisks: r.key_risks ?? '',
  ideasToRevisit: r.ideas_to_revisit ?? '',
  filesAdded: r.files_added ?? '',
  memoryInsights: r.memory_insights ?? '',
  nextWeekFocus: r.next_week_focus ?? '',
  suggestedTasks: normalizeSuggestedWeeklyTasks(r.suggested_tasks),
  suggestedProjectReviews: normalizeSuggestedProjectReviews(r.suggested_project_reviews),
  createdAt: r.created_at,
})

const toProjectDna = (r: ProjectDnaRow): ProjectDna => ({
  id: r.id,
  projectId: r.project_id,
  origin: r.origin ?? '',
  coreGoal: r.core_goal ?? '',
  currentDirection: r.current_direction ?? '',
  majorDecisions: r.major_decisions ?? '',
  recurringRisks: r.recurring_risks ?? '',
  momentumPattern: r.momentum_pattern ?? '',
  lessonsLearned: r.lessons_learned ?? '',
  nextStrategicMove: r.next_strategic_move ?? '',
  dnaSummary: r.dna_summary ?? '',
  confidenceScore: r.confidence_score ?? 50,
  createdAt: r.created_at,
})

const toPatternAnalysis = (r: PatternAnalysisRow): PatternAnalysis => ({
  id: r.id,
  summary: r.summary ?? '',
  recurringStrengths: r.recurring_strengths ?? '',
  recurringWeaknesses: r.recurring_weaknesses ?? '',
  executionPatterns: r.execution_patterns ?? '',
  ideaPatterns: r.idea_patterns ?? '',
  riskPatterns: r.risk_patterns ?? '',
  decisionPatterns: r.decision_patterns ?? '',
  projectMomentumPatterns: r.project_momentum_patterns ?? '',
  bottlenecks: r.bottlenecks ?? '',
  opportunities: r.opportunities ?? '',
  recommendedChanges: r.recommended_changes ?? '',
  suggestedActions: normalizeSuggestedPatternActions(r.suggested_actions),
  createdAt: r.created_at,
})

// ─── Load everything for the signed-in user ───────────────────────────────────

export async function loadAppState(supabase: SupabaseClient): Promise<AppState> {
  const [projects, tasks, notes, decisions, risks, roadmap, messages, ideas, links, projectFiles] = await Promise.all([
    supabase.from('projects').select('*').order('updated_at', { ascending: false }),
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('notes').select('*').order('created_at', { ascending: false }),
    supabase.from('decisions').select('*').order('created_at', { ascending: false }),
    supabase.from('risks').select('*').order('created_at', { ascending: false }),
    supabase.from('roadmap_items').select('*').order('sort_order', { ascending: true }),
    supabase.from('messages').select('*').order('created_at', { ascending: true }),
    supabase.from('ideas').select('*').order('updated_at', { ascending: false }),
    supabase.from('links').select('*').order('created_at', { ascending: false }),
    supabase.from('project_files').select('*').order('created_at', { ascending: false }),
  ])

  const firstError = projects.error || tasks.error || notes.error || decisions.error
    || risks.error || roadmap.error || messages.error || ideas.error || links.error || projectFiles.error
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
    projectFiles: (projectFiles.data ?? []).map(toProjectFile),
    links:        (links.data     ?? []).map(toLink),
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

  const [tasks, notes, decisions, risks, roadmap, messages, files] = await Promise.all([
    supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('decisions').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('risks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('roadmap_items').select('*').eq('project_id', projectId).order('sort_order', { ascending: true }),
    supabase.from('messages').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
    supabase.from('project_files').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
  ])

  const firstError = tasks.error || notes.error || decisions.error || risks.error || roadmap.error || messages.error || files.error
  if (firstError) throw firstError

  return {
    project:      toProject(projectData as ProjectRow),
    tasks:        (tasks.data    ?? []).map(toTask),
    notes:        (notes.data    ?? []).map(toNote),
    decisions:    (decisions.data ?? []).map(toDecision),
    risks:        (risks.data    ?? []).map(toRisk),
    roadmapItems: (roadmap.data  ?? []).map(toRoadmap),
    messages:     (messages.data ?? []).map(toMessage),
    projectFiles: (files.data    ?? []).map(toProjectFile),
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

// ─── Global Weekly Reviews ────────────────────────────────────────────────────

/** Load every weekly review for the signed-in user, newest first. */
export async function loadWeeklyReviews(supabase: SupabaseClient): Promise<WeeklyReview[]> {
  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toWeeklyReview(r as WeeklyReviewRow))
}

/**
 * Aggregate workspace data for global weekly review generation.
 * Keeps context concise — summaries, counts, and recent items only.
 */
export async function loadGlobalWorkspaceContext(
  supabase: SupabaseClient,
): Promise<WeeklyReviewContextInput> {
  const { weekStart, weekEnd } = getWeekBounds()

  const [
    projectsRes, tasksRes, notesRes, decisionsRes, risksRes, roadmapRes,
    ideasRes, linksRes, filesRes, reviewsRes, messagesRes,
  ] = await Promise.all([
    supabase.from('projects').select('*').order('updated_at', { ascending: false }),
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('decisions').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('risks').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('roadmap_items').select('*').order('sort_order', { ascending: true }),
    supabase.from('ideas').select('*').order('updated_at', { ascending: false }),
    supabase.from('links').select('*').order('created_at', { ascending: false }).limit(40),
    supabase.from('project_files').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('project_reviews').select('id, project_id, summary, created_at').order('created_at', { ascending: false }).limit(15),
    supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(30),
  ])

  const firstError =
    projectsRes.error || tasksRes.error || notesRes.error || decisionsRes.error ||
    risksRes.error || roadmapRes.error || ideasRes.error || linksRes.error ||
    filesRes.error || reviewsRes.error || messagesRes.error
  if (firstError) throw firstError

  const projects = (projectsRes.data ?? []).map(toProject)
  const projectMap = new Map(projects.map(p => [p.id, p.title]))
  const tasks = (tasksRes.data ?? []).map(toTask)
  const notes = (notesRes.data ?? []).map(toNote)
  const decisions = (decisionsRes.data ?? []).map(toDecision)
  const risks = (risksRes.data ?? []).map(toRisk)
  const roadmapItems = (roadmapRes.data ?? []).map(toRoadmap)
  const ideas = (ideasRes.data ?? []).map(toIdea)
  const links = (linksRes.data ?? []).map(toLink)
  const projectFiles = (filesRes.data ?? []).map(toProjectFile)

  const projectReviews = (reviewsRes.data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    projectTitle: projectMap.get(r.project_id) ?? 'Project',
    summary: r.summary ?? '',
    createdAt: r.created_at,
  }))

  const chatMessages: Record<string, Message[]> = {}
  ;(messagesRes.data ?? []).forEach(row => {
    const msg = toMessage(row as MessageRow)
    const pid = (row as MessageRow).project_id
    if (!chatMessages[pid]) chatMessages[pid] = []
    chatMessages[pid].push(msg)
  })

  const recentMessages = (messagesRes.data ?? []).map(row => {
    const r = row as MessageRow
    return {
      projectId: r.project_id,
      projectTitle: projectMap.get(r.project_id) ?? 'Project',
      role: r.role,
      content: r.content,
      createdAt: r.created_at,
    }
  })

  const stateForLinks: AppState = {
    projects, tasks, notes, decisions, risks, roadmapItems,
    ideas, projectFiles, links, chatMessages,
  }
  const resolve = buildLabelResolver(stateForLinks)
  const linkedMemorySummaries = summarizeLinks(links, resolve, 12)

  const latestDnaRecords = await loadLatestProjectDnaForAllProjects(supabase)
  const projectDnaSummaries = latestDnaRecords.map(d => ({
    projectId: d.projectId,
    projectTitle: projectMap.get(d.projectId) ?? 'Project',
    dnaSummary: d.dnaSummary,
    currentDirection: d.currentDirection,
    momentumPattern: d.momentumPattern,
    nextStrategicMove: d.nextStrategicMove,
    confidenceScore: d.confidenceScore,
  }))

  const latestPattern = await loadLatestPatternAnalysis(supabase)
  const latestPatternAnalysis = latestPattern
    ? { summary: latestPattern.summary, bottlenecks: latestPattern.bottlenecks, recommendedChanges: latestPattern.recommendedChanges }
    : undefined

  return {
    weekStart, weekEnd, projects, ideas, tasks, notes, decisions, risks,
    roadmapItems, projectReviews, projectDnaSummaries, latestPatternAnalysis,
    projectFiles, links, recentMessages, linkedMemorySummaries,
  }
}

/** Insert a generated weekly review and return the saved row. */
export async function createWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string,
  weekEnd: string,
  fields: NormalizedWeeklyReviewFields,
): Promise<WeeklyReview> {
  const { data, error } = await supabase.from('weekly_reviews').insert({
    user_id: userId,
    week_start: weekStart,
    week_end: weekEnd,
    summary: fields.summary,
    completed_work: fields.completedWork,
    active_projects: fields.activeProjects,
    stuck_projects: fields.stuckProjects,
    key_decisions: fields.keyDecisions,
    key_risks: fields.keyRisks,
    ideas_to_revisit: fields.ideasToRevisit,
    files_added: fields.filesAdded,
    memory_insights: fields.memoryInsights,
    next_week_focus: fields.nextWeekFocus,
    suggested_tasks: fields.suggestedTasks,
    suggested_project_reviews: fields.suggestedProjectReviews,
  }).select('*').single()
  if (error) throw error
  return toWeeklyReview(data as WeeklyReviewRow)
}

// ─── Project DNA ──────────────────────────────────────────────────────────────

/** Load every DNA profile for a project, newest first. */
export async function loadProjectDna(
  supabase: SupabaseClient, projectId: string,
): Promise<ProjectDna[]> {
  const { data, error } = await supabase
    .from('project_dna')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toProjectDna(r as ProjectDnaRow))
}

/** Latest DNA profile for one project, or null. */
export async function loadLatestProjectDna(
  supabase: SupabaseClient, projectId: string,
): Promise<ProjectDna | null> {
  const { data, error } = await supabase
    .from('project_dna')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? toProjectDna(data as ProjectDnaRow) : null
}

/** Latest DNA per project (for weekly review + command search). */
export async function loadLatestProjectDnaForAllProjects(
  supabase: SupabaseClient,
): Promise<ProjectDna[]> {
  const { data, error } = await supabase
    .from('project_dna')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  const seen = new Set<string>()
  const latest: ProjectDna[] = []
  for (const row of data ?? []) {
    const dna = toProjectDna(row as ProjectDnaRow)
    if (seen.has(dna.projectId)) continue
    seen.add(dna.projectId)
    latest.push(dna)
  }
  return latest
}

async function loadIdeaOriginForProject(
  supabase: SupabaseClient, projectId: string,
): Promise<IdeaOriginContext | undefined> {
  const { data: linkData } = await supabase
    .from('links')
    .select('source_id')
    .eq('target_type', 'project')
    .eq('target_id', projectId)
    .eq('source_type', 'idea')
    .eq('relationship_type', 'converted_to')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!linkData?.source_id) return undefined

  const ideaId = linkData.source_id
  const [ideaRes, analysisRes] = await Promise.all([
    supabase.from('ideas').select('*').eq('id', ideaId).maybeSingle(),
    supabase.from('idea_analyses').select('summary').eq('idea_id', ideaId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!ideaRes.data) return undefined
  const idea = toIdea(ideaRes.data as IdeaRow)
  return {
    ideaTitle: idea.title,
    ideaDescription: idea.description,
    ideaStatus: idea.status,
    analysisSummary: analysisRes.data?.summary ?? undefined,
  }
}

/** Aggregate project data for DNA generation. */
export async function loadProjectDnaContext(
  supabase: SupabaseClient, projectId: string,
): Promise<ProjectDnaContextInput | null> {
  const base = await loadProjectContext(supabase, projectId)
  if (!base) return null

  const [reviews, previousDna, ideaOrigin, allLinks] = await Promise.all([
    loadProjectReviews(supabase, projectId),
    loadLatestProjectDna(supabase, projectId),
    loadIdeaOriginForProject(supabase, projectId),
    loadLinks(supabase),
  ])

  const stateForLinks: AppState = {
    projects: [base.project],
    tasks: base.tasks, notes: base.notes, decisions: base.decisions,
    risks: base.risks, roadmapItems: base.roadmapItems,
    projectFiles: base.projectFiles ?? [], ideas: [],
    links: allLinks, chatMessages: { [projectId]: base.messages },
  }
  const ids = collectProjectEntityIds(stateForLinks, projectId)
  const linkedMemory = summarizeLinks(
    getProjectLinks(allLinks, ids),
    buildLabelResolver(stateForLinks),
  )

  return {
    project: base.project,
    tasks: base.tasks,
    notes: base.notes,
    decisions: base.decisions,
    risks: base.risks,
    roadmapItems: base.roadmapItems,
    messages: base.messages,
    projectFiles: base.projectFiles ?? [],
    projectReviews: reviews,
    linkedMemory,
    ideaOrigin,
    previousDna: previousDna ?? undefined,
  }
}

/** Insert a generated DNA profile and return the saved row. */
export async function createProjectDna(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  fields: NormalizedProjectDnaFields,
): Promise<ProjectDna> {
  const { data, error } = await supabase.from('project_dna').insert({
    user_id: userId,
    project_id: projectId,
    origin: fields.origin,
    core_goal: fields.coreGoal,
    current_direction: fields.currentDirection,
    major_decisions: fields.majorDecisions,
    recurring_risks: fields.recurringRisks,
    momentum_pattern: fields.momentumPattern,
    lessons_learned: fields.lessonsLearned,
    next_strategic_move: fields.nextStrategicMove,
    dna_summary: fields.dnaSummary,
    confidence_score: fields.confidenceScore,
  }).select('*').single()
  if (error) throw error
  return toProjectDna(data as ProjectDnaRow)
}

// ─── Cross-Project Pattern Analysis ───────────────────────────────────────────

export async function loadPatternAnalyses(supabase: SupabaseClient): Promise<PatternAnalysis[]> {
  const { data, error } = await supabase
    .from('pattern_analyses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toPatternAnalysis(r as PatternAnalysisRow))
}

export async function loadLatestPatternAnalysis(
  supabase: SupabaseClient,
): Promise<PatternAnalysis | null> {
  const { data, error } = await supabase
    .from('pattern_analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? toPatternAnalysis(data as PatternAnalysisRow) : null
}

/** Aggregate workspace data for cross-project pattern analysis. */
export async function loadPatternAnalysisContext(
  supabase: SupabaseClient,
): Promise<PatternAnalysisContextInput> {
  const workspace = await loadGlobalWorkspaceContext(supabase)

  const weeklyRes = await supabase
    .from('weekly_reviews')
    .select('week_start, week_end, summary, next_week_focus, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const weeklyReviews: WeeklyReviewSummary[] = (weeklyRes.data ?? []).map(r => ({
    weekStart: r.week_start,
    weekEnd: r.week_end,
    summary: r.summary ?? '',
    nextWeekFocus: r.next_week_focus ?? '',
    createdAt: r.created_at,
  }))

  const fileSummaries = workspace.projectFiles
    .slice(0, 10)
    .map(f => {
      const projectTitle = workspace.projects.find(p => p.id === f.projectId)?.title ?? 'Project'
      const summary = f.summary?.trim()
      return summary
        ? `[${projectTitle}] ${f.fileName}: ${summary.replace(/\s+/g, ' ').slice(0, 100)}`
        : `[${projectTitle}] ${f.fileName}`
    })

  const activeProjects = workspace.projects.filter(p => p.status !== 'archived')
  const openTasks = workspace.tasks.filter(t => t.status !== 'done')
  const doneTasks = workspace.tasks.filter(t => t.status === 'done')
  const openRisks = workspace.risks.filter(r => r.status === 'open')

  const dataCounts: PatternDataCounts = {
    projects: workspace.projects.length,
    activeProjects: activeProjects.length,
    tasks: workspace.tasks.length,
    openTasks: openTasks.length,
    doneTasks: doneTasks.length,
    ideas: workspace.ideas.length,
    decisions: workspace.decisions.length,
    risks: workspace.risks.length,
    openRisks: openRisks.length,
    projectReviews: workspace.projectReviews.length,
    weeklyReviews: weeklyReviews.length,
    dnaProfiles: workspace.projectDnaSummaries.length,
    files: workspace.projectFiles.length,
  }

  return {
    projects: workspace.projects,
    ideas: workspace.ideas,
    tasks: workspace.tasks,
    decisions: workspace.decisions,
    risks: workspace.risks,
    projectReviews: workspace.projectReviews,
    weeklyReviews,
    projectDnaSummaries: workspace.projectDnaSummaries,
    linkedMemorySummaries: workspace.linkedMemorySummaries,
    fileSummaries,
    dataCounts,
  }
}

export async function createPatternAnalysis(
  supabase: SupabaseClient,
  userId: string,
  fields: NormalizedPatternAnalysisFields,
): Promise<PatternAnalysis> {
  const { data, error } = await supabase.from('pattern_analyses').insert({
    user_id: userId,
    summary: fields.summary,
    recurring_strengths: fields.recurringStrengths,
    recurring_weaknesses: fields.recurringWeaknesses,
    execution_patterns: fields.executionPatterns,
    idea_patterns: fields.ideaPatterns,
    risk_patterns: fields.riskPatterns,
    decision_patterns: fields.decisionPatterns,
    project_momentum_patterns: fields.projectMomentumPatterns,
    bottlenecks: fields.bottlenecks,
    opportunities: fields.opportunities,
    recommended_changes: fields.recommendedChanges,
    suggested_actions: fields.suggestedActions,
  }).select('*').single()
  if (error) throw error
  return toPatternAnalysis(data as PatternAnalysisRow)
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

// ─── Links (Knowledge Graph) ──────────────────────────────────────────────────

/** All of the signed-in user's links (RLS scoped), newest first. */
export async function loadLinks(supabase: SupabaseClient): Promise<Link[]> {
  const { data, error } = await supabase.from('links').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toLink(r as LinkRow))
}

export async function createLink(supabase: SupabaseClient, userId: string, d: NewLink): Promise<Link> {
  const { data, error } = await supabase.from('links').insert({
    user_id: userId,
    source_type: d.sourceType, source_id: d.sourceId,
    target_type: d.targetType, target_id: d.targetId,
    relationship_type: d.relationshipType,
    description: d.description ?? null,
  }).select('*').single()
  if (error) throw error
  return toLink(data as LinkRow)
}

/** Links where the given entity is either the source or the target. */
export async function getLinksForEntity(supabase: SupabaseClient, type: EntityType, id: string): Promise<Link[]> {
  const { data, error } = await supabase
    .from('links')
    .select('*')
    .or(`and(source_type.eq.${type},source_id.eq.${id}),and(target_type.eq.${type},target_id.eq.${id})`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toLink(r as LinkRow))
}

export async function deleteLink(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('links').delete().eq('id', id)
  if (error) throw error
}

// ─── Project Files ────────────────────────────────────────────────────────────

export async function createProjectFile(
  supabase: SupabaseClient, userId: string, d: NewProjectFile,
): Promise<ProjectFile> {
  const { data, error } = await supabase.from('project_files').insert({
    user_id: userId,
    project_id: d.projectId,
    file_name: d.fileName,
    file_path: d.filePath,
    file_type: d.fileType,
    file_size: d.fileSize,
    extracted_text: d.extractedText ?? null,
    status: 'Uploaded',
  }).select('*').single()
  if (error) throw error
  return toProjectFile(data as ProjectFileRow)
}

export async function updateProjectFile(
  supabase: SupabaseClient, id: string,
  d: Partial<Pick<ProjectFile, 'summary' | 'extractedText' | 'status'>>,
): Promise<ProjectFile> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.summary       !== undefined) patch.summary = d.summary
  if (d.extractedText !== undefined) patch.extracted_text = d.extractedText
  if (d.status        !== undefined) patch.status = d.status
  const { data, error } = await supabase.from('project_files').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return toProjectFile(data as ProjectFileRow)
}

export async function loadProjectFile(supabase: SupabaseClient, fileId: string): Promise<ProjectFile | null> {
  const { data, error } = await supabase.from('project_files').select('*').eq('id', fileId).maybeSingle()
  if (error) throw error
  return data ? toProjectFile(data as ProjectFileRow) : null
}

export async function deleteProjectFileRecord(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('project_files').delete().eq('id', id)
  if (error) throw error
}
