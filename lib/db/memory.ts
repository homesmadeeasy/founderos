/**
 * Supabase data access: memory
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
