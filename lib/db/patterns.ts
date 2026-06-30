/**
 * Supabase data access: patterns
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
import type { NormalizedPatternAnalysisFields, PatternAnalysisContextInput, PatternDataCounts, WeeklyReviewSummary } from '@/lib/pattern-analysis'
import { loadGlobalWorkspaceContext } from './weekly-reviews'


export async function loadPatternAnalyses(supabase: SupabaseClient): Promise<PatternAnalysis[]> {
  const { data, error } = await supabase
    .from('pattern_analyses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toPatternAnalysis(r as PatternAnalysisRow))
}

export async function loadLatestPatternAnalysis(
  supabase: SupabaseClient,
): Promise<PatternAnalysis | null> {
  const { data, error } = await supabase
    .from('pattern_analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? toPatternAnalysis(data as PatternAnalysisRow) : null
}

/** Aggregate workspace data for cross-project pattern analysis. */
export async function loadPatternAnalysisContext(
  supabase: SupabaseClient,
): Promise<PatternAnalysisContextInput> {
  const workspace = await loadGlobalWorkspaceContext(supabase)

  const weeklyRes = await supabase
    .from('weekly_reviews')
    .select('week_start, week_end, summary, next_week_focus, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const weeklyReviews: WeeklyReviewSummary[] = (weeklyRes.data ?? []).map(r => ({
    weekStart: r.week_start,
    weekEnd: r.week_end,
    summary: r.summary ?? '',
    nextWeekFocus: r.next_week_focus ?? '',
    createdAt: r.created_at,
  }))

  const fileSummaries = workspace.projectFiles
    .slice(0, 10)
    .map(f => {
      const projectTitle = workspace.projects.find(p => p.id === f.projectId)?.title ?? 'Project'
      const summary = f.summary?.trim()
      return summary
        ? `[${projectTitle}] ${f.fileName}: ${summary.replace(/\s+/g, ' ').slice(0, 100)}`
        : `[${projectTitle}] ${f.fileName}`
    })

  const activeProjects = workspace.projects.filter(p => p.status !== 'archived')
  const openTasks = workspace.tasks.filter(t => t.status !== 'done')
  const doneTasks = workspace.tasks.filter(t => t.status === 'done')
  const openRisks = workspace.risks.filter(r => r.status === 'open')

  const dataCounts: PatternDataCounts = {
    projects: workspace.projects.length,
    activeProjects: activeProjects.length,
    tasks: workspace.tasks.length,
    openTasks: openTasks.length,
    doneTasks: doneTasks.length,
    ideas: workspace.ideas.length,
    decisions: workspace.decisions.length,
    risks: workspace.risks.length,
    openRisks: openRisks.length,
    projectReviews: workspace.projectReviews.length,
    weeklyReviews: weeklyReviews.length,
    dnaProfiles: workspace.projectDnaSummaries.length,
    files: workspace.projectFiles.length,
  }

  return {
    projects: workspace.projects,
    ideas: workspace.ideas,
    tasks: workspace.tasks,
    decisions: workspace.decisions,
    risks: workspace.risks,
    projectReviews: workspace.projectReviews,
    weeklyReviews,
    projectDnaSummaries: workspace.projectDnaSummaries,
    linkedMemorySummaries: workspace.linkedMemorySummaries,
    fileSummaries,
    dataCounts,
  }
}

export async function createPatternAnalysis(
  supabase: SupabaseClient,
  userId: string,
  fields: NormalizedPatternAnalysisFields,
): Promise<PatternAnalysis> {
  const { data, error } = await supabase.from('pattern_analyses').insert({
    user_id: userId,
    summary: fields.summary,
    recurring_strengths: fields.recurringStrengths,
    recurring_weaknesses: fields.recurringWeaknesses,
    execution_patterns: fields.executionPatterns,
    idea_patterns: fields.ideaPatterns,
    risk_patterns: fields.riskPatterns,
    decision_patterns: fields.decisionPatterns,
    project_momentum_patterns: fields.projectMomentumPatterns,
    bottlenecks: fields.bottlenecks,
    opportunities: fields.opportunities,
    recommended_changes: fields.recommendedChanges,
    suggested_actions: fields.suggestedActions,
  }).select('*').single()
  if (error) throw error
  return toPatternAnalysis(data as PatternAnalysisRow)
}
