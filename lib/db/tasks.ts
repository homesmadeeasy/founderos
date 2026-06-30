/**
 * Supabase data access: tasks
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
