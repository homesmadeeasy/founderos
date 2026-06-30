/**
 * Supabase data access: app-state
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


export async function loadAppState(supabase: SupabaseClient): Promise<AppState> {
  const [projects, tasks, notes, decisions, risks, roadmap, messages, ideas, links, projectFiles] = await Promise.all([
    supabase.from('projects').select('*').order('updated_at', { ascending: false }),
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('notes').select('*').order('created_at', { ascending: false }),
    supabase.from('decisions').select('*').order('created_at', { ascending: false }),
    supabase.from('risks').select('*').order('created_at', { ascending: false }),
    supabase.from('roadmap_items').select('*').order('sort_order', { ascending: true }),
    supabase.from('messages').select('*').order('created_at', { ascending: true }),
    supabase.from('ideas').select('*').order('updated_at', { ascending: false }),
    supabase.from('links').select('*').order('created_at', { ascending: false }),
    supabase.from('project_files').select('*').order('created_at', { ascending: false }),
  ])

  const firstError = projects.error || tasks.error || notes.error || decisions.error
    || risks.error || roadmap.error || messages.error || ideas.error || links.error || projectFiles.error
  if (firstError) throw firstError

  // Group messages by project
  const chatMessages: Record<string, Message[]> = {}
  for (const row of (messages.data ?? []) as MessageRow[]) {
    ;(chatMessages[row.project_id] ??= []).push(toMessage(row))
  }

  return {
    projects:     (projects.data  ?? []).map(toProject),
    tasks:        (tasks.data     ?? []).map(toTask),
    notes:        (notes.data     ?? []).map(toNote),
    decisions:    (decisions.data ?? []).map(toDecision),
    risks:        (risks.data     ?? []).map(toRisk),
    roadmapItems: (roadmap.data   ?? []).map(toRoadmap),
    ideas:        (ideas.data     ?? []).map(toIdea),
    projectFiles: (projectFiles.data ?? []).map(toProjectFile),
    links:        (links.data     ?? []).map(toLink),
    chatMessages,
  }
}
