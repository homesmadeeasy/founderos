/**
 * Supabase data access: reviews
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
import type { NormalizedReviewFields } from '@/lib/review'


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
