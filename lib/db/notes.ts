/**
 * Supabase data access: notes
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
