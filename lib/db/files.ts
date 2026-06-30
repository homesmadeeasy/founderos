/**
 * Supabase data access: files
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


export async function createProjectFile(
  supabase: SupabaseClient, userId: string, d: NewProjectFile,
): Promise<ProjectFile> {
  const { data, error } = await supabase.from('project_files').insert({
    user_id: userId,
    project_id: d.projectId,
    file_name: d.fileName,
    file_path: d.filePath,
    file_type: d.fileType,
    file_size: d.fileSize,
    extracted_text: d.extractedText ?? null,
    status: 'Uploaded',
  }).select('*').single()
  if (error) throw error
  return toProjectFile(data as ProjectFileRow)
}

export async function updateProjectFile(
  supabase: SupabaseClient, id: string,
  d: Partial<Pick<ProjectFile, 'summary' | 'extractedText' | 'status'>>,
): Promise<ProjectFile> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.summary       !== undefined) patch.summary = d.summary
  if (d.extractedText !== undefined) patch.extracted_text = d.extractedText
  if (d.status        !== undefined) patch.status = d.status
  const { data, error } = await supabase.from('project_files').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return toProjectFile(data as ProjectFileRow)
}

export async function loadProjectFile(supabase: SupabaseClient, fileId: string): Promise<ProjectFile | null> {
  const { data, error } = await supabase.from('project_files').select('*').eq('id', fileId).maybeSingle()
  if (error) throw error
  return data ? toProjectFile(data as ProjectFileRow) : null
}

export async function deleteProjectFileRecord(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('project_files').delete().eq('id', id)
  if (error) throw error
}
