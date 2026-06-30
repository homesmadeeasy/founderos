/**
 * Supabase data access: ideas
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
import type { NormalizedIdeaAnalysisFields } from '@/lib/idea'


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
