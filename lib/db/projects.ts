/**
 * Supabase data access: projects
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


export async function createProject(supabase: SupabaseClient, userId: string, d: NewProject): Promise<Project> {
  const { data, error } = await supabase.from('projects').insert({
    user_id: userId, title: d.title, description: d.description, goal: d.goal,
    world_type: d.worldType ?? 'Custom', world_purpose: d.worldPurpose ?? '',
    life_area: d.lifeArea ?? '',
    status: d.status, priority: d.priority, progress: d.progress,
  }).select('*').single()
  if (error) throw error
  return toProject(data as ProjectRow)
}

export async function updateProject(supabase: SupabaseClient, id: string, d: Partial<Omit<Project, 'id' | 'createdAt'>>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.title         !== undefined) patch.title = d.title
  if (d.description   !== undefined) patch.description = d.description
  if (d.goal          !== undefined) patch.goal = d.goal
  if (d.worldType     !== undefined) patch.world_type = d.worldType
  if (d.worldPurpose  !== undefined) patch.world_purpose = d.worldPurpose
  if (d.lifeArea      !== undefined) patch.life_area = d.lifeArea
  if (d.status        !== undefined) patch.status = d.status
  if (d.priority      !== undefined) patch.priority = d.priority
  if (d.progress      !== undefined) patch.progress = d.progress
  const { error } = await supabase.from('projects').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteProject(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
