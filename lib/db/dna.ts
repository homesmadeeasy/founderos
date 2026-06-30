/**
 * Supabase data access: dna
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AppState, Project, Task, Note, Decision, Risk, RoadmapItem, Message,
  ProjectReview, Idea, IdeaAnalysis, Link, EntityType, ProjectFile,
  MessageRole, WeeklyReview, ProjectDna, PatternAnalysis, UserProfile,
} from '@/lib/types'
import type {
  NewProject, NewTask, NewNote, NewDecision, NewRisk, NewRoadmapItem,
  NewIdea, NewLink, NewProjectFile,
} from './input-types'
import {
  toProject, toTask, toNote, toDecision, toRisk, toRoadmap, toMessage,
  toIdea, toIdeaAnalysis, toLink, toProjectFile, toProjectReview,
  toWeeklyReview, toProjectDna, toPatternAnalysis,
  type ProjectRow, type TaskRow, type NoteRow, type DecisionRow, type RiskRow,
  type RoadmapRow, type MessageRow, type IdeaRow, type IdeaAnalysisRow,
  type LinkRow, type ProjectFileRow, type ProjectReviewRow, type WeeklyReviewRow,
  type ProjectDnaRow, type PatternAnalysisRow,
} from './mappers'
import type { NormalizedProjectDnaFields, ProjectDnaContextInput, IdeaOriginContext } from '@/lib/project-dna'
import { buildLabelResolver, summarizeLinks, collectProjectEntityIds, getProjectLinks } from '@/lib/links'
import { loadProjectContext } from './context'
import { loadProjectReviews } from './reviews'
import { loadLinks } from './memory'


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
