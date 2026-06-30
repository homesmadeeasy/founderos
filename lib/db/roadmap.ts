/**
 * Supabase data access: roadmap
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
