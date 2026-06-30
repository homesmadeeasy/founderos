/**
 * Supabase data access: decisions
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


export async function createDecision(supabase: SupabaseClient, userId: string, d: NewDecision): Promise<Decision> {
  const { data, error } = await supabase.from('decisions').insert({
    user_id: userId, project_id: d.projectId, decision: d.decision, reasoning: d.reasoning,
    source_message_id: d.sourceMessageId ?? null,
  }).select('*').single()
  if (error) throw error
  return toDecision(data as DecisionRow)
}

export async function deleteDecision(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('decisions').delete().eq('id', id)
  if (error) throw error
}
