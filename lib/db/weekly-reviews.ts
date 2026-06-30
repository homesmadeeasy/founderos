/**
 * Supabase data access: weekly-reviews
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
import type { WeeklyReviewContextInput } from '@/lib/weekly-review'
import { getWeekBounds, type NormalizedWeeklyReviewFields } from '@/lib/weekly-review'
import { buildLabelResolver, summarizeLinks } from '@/lib/links'
import { loadLatestProjectDnaForAllProjects } from './dna'
import { loadLatestPatternAnalysis } from './patterns'


/** Load every weekly review for the signed-in user, newest first. */
export async function loadWeeklyReviews(supabase: SupabaseClient): Promise<WeeklyReview[]> {
  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toWeeklyReview(r as WeeklyReviewRow))
}

/**
 * Aggregate workspace data for global weekly review generation.
 * Keeps context concise — summaries, counts, and recent items only.
 */
export async function loadGlobalWorkspaceContext(
  supabase: SupabaseClient,
): Promise<WeeklyReviewContextInput> {
  const { weekStart, weekEnd } = getWeekBounds()

  const [
    projectsRes, tasksRes, notesRes, decisionsRes, risksRes, roadmapRes,
    ideasRes, linksRes, filesRes, reviewsRes, messagesRes,
  ] = await Promise.all([
    supabase.from('projects').select('*').order('updated_at', { ascending: false }),
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('decisions').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('risks').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('roadmap_items').select('*').order('sort_order', { ascending: true }),
    supabase.from('ideas').select('*').order('updated_at', { ascending: false }),
    supabase.from('links').select('*').order('created_at', { ascending: false }).limit(40),
    supabase.from('project_files').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('project_reviews').select('id, project_id, summary, created_at').order('created_at', { ascending: false }).limit(15),
    supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(30),
  ])

  const firstError =
    projectsRes.error || tasksRes.error || notesRes.error || decisionsRes.error ||
    risksRes.error || roadmapRes.error || ideasRes.error || linksRes.error ||
    filesRes.error || reviewsRes.error || messagesRes.error
  if (firstError) throw firstError

  const projects = (projectsRes.data ?? []).map(toProject)
  const projectMap = new Map(projects.map(p => [p.id, p.title]))
  const tasks = (tasksRes.data ?? []).map(toTask)
  const notes = (notesRes.data ?? []).map(toNote)
  const decisions = (decisionsRes.data ?? []).map(toDecision)
  const risks = (risksRes.data ?? []).map(toRisk)
  const roadmapItems = (roadmapRes.data ?? []).map(toRoadmap)
  const ideas = (ideasRes.data ?? []).map(toIdea)
  const links = (linksRes.data ?? []).map(toLink)
  const projectFiles = (filesRes.data ?? []).map(toProjectFile)

  const projectReviews = (reviewsRes.data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    projectTitle: projectMap.get(r.project_id) ?? 'Project',
    summary: r.summary ?? '',
    createdAt: r.created_at,
  }))

  const chatMessages: Record<string, Message[]> = {}
  ;(messagesRes.data ?? []).forEach(row => {
    const msg = toMessage(row as MessageRow)
    const pid = (row as MessageRow).project_id
    if (!chatMessages[pid]) chatMessages[pid] = []
    chatMessages[pid].push(msg)
  })

  const recentMessages = (messagesRes.data ?? []).map(row => {
    const r = row as MessageRow
    return {
      projectId: r.project_id,
      projectTitle: projectMap.get(r.project_id) ?? 'Project',
      role: r.role,
      content: r.content,
      createdAt: r.created_at,
    }
  })

  const stateForLinks: AppState = {
    projects, tasks, notes, decisions, risks, roadmapItems,
    ideas, projectFiles, links, chatMessages,
  }
  const resolve = buildLabelResolver(stateForLinks)
  const linkedMemorySummaries = summarizeLinks(links, resolve, 12)

  const latestDnaRecords = await loadLatestProjectDnaForAllProjects(supabase)
  const projectDnaSummaries = latestDnaRecords.map(d => ({
    projectId: d.projectId,
    projectTitle: projectMap.get(d.projectId) ?? 'Project',
    dnaSummary: d.dnaSummary,
    currentDirection: d.currentDirection,
    momentumPattern: d.momentumPattern,
    nextStrategicMove: d.nextStrategicMove,
    confidenceScore: d.confidenceScore,
  }))

  const latestPattern = await loadLatestPatternAnalysis(supabase)
  const latestPatternAnalysis = latestPattern
    ? { summary: latestPattern.summary, bottlenecks: latestPattern.bottlenecks, recommendedChanges: latestPattern.recommendedChanges }
    : undefined

  return {
    weekStart, weekEnd, projects, ideas, tasks, notes, decisions, risks,
    roadmapItems, projectReviews, projectDnaSummaries, latestPatternAnalysis,
    projectFiles, links, recentMessages, linkedMemorySummaries,
  }
}

/** Insert a generated weekly review and return the saved row. */
export async function createWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string,
  weekEnd: string,
  fields: NormalizedWeeklyReviewFields,
): Promise<WeeklyReview> {
  const { data, error } = await supabase.from('weekly_reviews').insert({
    user_id: userId,
    week_start: weekStart,
    week_end: weekEnd,
    summary: fields.summary,
    completed_work: fields.completedWork,
    active_projects: fields.activeProjects,
    stuck_projects: fields.stuckProjects,
    key_decisions: fields.keyDecisions,
    key_risks: fields.keyRisks,
    ideas_to_revisit: fields.ideasToRevisit,
    files_added: fields.filesAdded,
    memory_insights: fields.memoryInsights,
    next_week_focus: fields.nextWeekFocus,
    suggested_tasks: fields.suggestedTasks,
    suggested_project_reviews: fields.suggestedProjectReviews,
  }).select('*').single()
  if (error) throw error
  return toWeeklyReview(data as WeeklyReviewRow)
}
