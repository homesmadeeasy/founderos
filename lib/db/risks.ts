/**
 * Supabase data access: risks
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
