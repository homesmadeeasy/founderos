/**
 * Supabase data access: context
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
import type { ReviewContextInput } from '@/lib/review'


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
