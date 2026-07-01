/**
 * Supabase row types and row → app mappers.
 */

import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Message, Idea, IdeaAnalysis, Link,
  ProjectFile, ProjectReview, WeeklyReview, ProjectDna, PatternAnalysis, Goal, GoalReview, GoalLink,
  ProjectStatus, ProjectPriority, TaskStatus, TaskPriority, RiskSeverity, RiskStatus,
  RoadmapStatus, MessageRole, IdeaStatus, EntityType, FileStatus, WorldType,
  GoalCategory, GoalPriority, GoalStatus,
} from '@/lib/types'
import { normalizeSuggestedTasks, normalizeSuggestedRoadmapItems } from '@/lib/review'
import { normalizeSuggestedWeeklyTasks, normalizeSuggestedProjectReviews } from '@/lib/weekly-review'
import { normalizeSuggestedPatternActions } from '@/lib/pattern-analysis'
import { normalizeSuggestedGoalTasks } from '@/lib/goal'
import {
  normalizeSuggestedProject, normalizeSuggestedIdeaTasks,
  normalizeSuggestedIdeaRisks, normalizeSuggestedIdeaRoadmapItems,
} from '@/lib/idea'

// ─── DB row types (snake_case) ──────────────────────────────────────────────

export interface ProjectRow  {
  id: string; title: string; description: string | null; goal: string | null
  world_type: string | null; world_purpose: string | null; life_area: string | null
  status: string; priority: string; progress: number; created_at: string; updated_at: string
}
export interface TaskRow     { id: string; project_id: string; title: string; description: string | null; status: string; priority: string; due_date: string | null; created_at: string }
export interface NoteRow     { id: string; project_id: string; title: string; content: string | null; created_at: string }
export interface DecisionRow { id: string; project_id: string; decision: string; reasoning: string | null; created_at: string }
export interface RiskRow     { id: string; project_id: string; title: string; description: string | null; severity: string; mitigation: string | null; status: string; created_at: string }
export interface RoadmapRow  { id: string; project_id: string; title: string; description: string | null; stage: string | null; status: string; sort_order: number; created_at: string }
export interface MessageRow  { id: string; project_id: string; role: string; content: string; created_at: string }
export interface ProjectReviewRow {
  id: string; project_id: string
  summary: string | null; progress_review: string | null; completed_work: string | null
  blockers: string | null; key_risks: string | null; key_decisions: string | null
  next_7_day_plan: string | null; suggested_tasks: unknown; suggested_roadmap_items: unknown
  created_at: string
}
export interface IdeaRow {
  id: string; title: string; description: string | null; target_user: string | null
  problem: string | null; solution: string | null; potential_score: number | null
  difficulty_score: number | null; status: string; tags: string[] | null
  created_at: string; updated_at: string
}
export interface IdeaAnalysisRow {
  id: string; idea_id: string
  summary: string | null; target_user_analysis: string | null; problem_analysis: string | null
  market_potential: string | null; difficulty_analysis: string | null; risks: string | null
  mvp_suggestion: string | null; validation_plan: string | null; next_steps: string | null
  suggested_project: unknown; suggested_tasks: unknown; suggested_risks: unknown
  suggested_roadmap_items: unknown; created_at: string
}
export interface LinkRow {
  id: string; source_type: string; source_id: string; target_type: string; target_id: string
  relationship_type: string; description: string | null; created_at: string
}
export interface ProjectFileRow {
  id: string; project_id: string; file_name: string; file_path: string; file_type: string | null
  file_size: number | null; summary: string | null; extracted_text: string | null
  status: string; created_at: string; updated_at: string
}
export interface WeeklyReviewRow {
  id: string; week_start: string; week_end: string
  summary: string | null; completed_work: string | null; active_projects: string | null
  stuck_projects: string | null; key_decisions: string | null; key_risks: string | null
  ideas_to_revisit: string | null; files_added: string | null; memory_insights: string | null
  next_week_focus: string | null; suggested_tasks: unknown; suggested_project_reviews: unknown
  created_at: string
}
export interface ProjectDnaRow {
  id: string; project_id: string
  origin: string | null; core_goal: string | null; current_direction: string | null
  major_decisions: string | null; recurring_risks: string | null; momentum_pattern: string | null
  lessons_learned: string | null; next_strategic_move: string | null; dna_summary: string | null
  confidence_score: number | null; created_at: string
}
export interface PatternAnalysisRow {
  id: string
  summary: string | null; recurring_strengths: string | null; recurring_weaknesses: string | null
  execution_patterns: string | null; idea_patterns: string | null; risk_patterns: string | null
  decision_patterns: string | null; project_momentum_patterns: string | null
  bottlenecks: string | null; opportunities: string | null; recommended_changes: string | null
  suggested_actions: unknown; created_at: string
}

export interface GoalRow {
  id: string; title: string; description: string | null; category: string | null
  priority: string | null; status: string | null; progress: number | null
  timeframe: string | null; success_criteria: string | null; why_it_matters: string | null
  constraints: string | null; created_at: string; updated_at: string
}

export interface GoalLinkRow {
  id: string; goal_id: string; entity_type: string; entity_id: string
  relationship_type: string | null; created_at: string
}

export interface GoalReviewRow {
  id: string; goal_id: string; progress_review: string | null; blockers: string | null
  conflicts: string | null; next_actions: string | null; recommended_focus: string | null
  confidence_score: number | null; suggested_tasks: unknown; created_at: string
}

// ─── Row → app mappers ──────────────────────────────────────────────────────

export const toProject = (r: ProjectRow): Project => ({
  id: r.id, title: r.title, description: r.description ?? '', goal: r.goal ?? '',
  worldType: (r.world_type ?? 'Custom') as WorldType,
  worldPurpose: r.world_purpose ?? '',
  lifeArea: r.life_area ?? '',
  status: r.status as ProjectStatus, priority: r.priority as ProjectPriority,
  progress: r.progress ?? 0, createdAt: r.created_at, updatedAt: r.updated_at,
})

export const toTask = (r: TaskRow): Task => ({
  id: r.id, projectId: r.project_id, title: r.title, description: r.description ?? '',
  status: r.status as TaskStatus, priority: r.priority as TaskPriority,
  dueDate: r.due_date ?? undefined, createdAt: r.created_at,
})

export const toNote = (r: NoteRow): Note => ({
  id: r.id, projectId: r.project_id, title: r.title, content: r.content ?? '', createdAt: r.created_at,
})

export const toDecision = (r: DecisionRow): Decision => ({
  id: r.id, projectId: r.project_id, decision: r.decision, reasoning: r.reasoning ?? '', createdAt: r.created_at,
})

export const toRisk = (r: RiskRow): Risk => ({
  id: r.id, projectId: r.project_id, title: r.title, description: r.description ?? '',
  severity: r.severity as RiskSeverity, mitigation: r.mitigation ?? '',
  status: r.status as RiskStatus, createdAt: r.created_at,
})

export const toRoadmap = (r: RoadmapRow): RoadmapItem => ({
  id: r.id, projectId: r.project_id, title: r.title, description: r.description ?? '',
  stage: r.stage ?? '', status: r.status as RoadmapStatus, sortOrder: r.sort_order ?? 0, createdAt: r.created_at,
})

export const toMessage = (r: MessageRow): Message => ({
  id: r.id, role: r.role as MessageRole, content: r.content, createdAt: r.created_at,
})

export const toIdea = (r: IdeaRow): Idea => ({
  id: r.id, title: r.title, description: r.description ?? '',
  targetUser: r.target_user ?? '', problem: r.problem ?? '', solution: r.solution ?? '',
  potentialScore: r.potential_score ?? 5, difficultyScore: r.difficulty_score ?? 5,
  status: r.status as IdeaStatus, tags: r.tags ?? [],
  createdAt: r.created_at, updatedAt: r.updated_at,
})

export const toIdeaAnalysis = (r: IdeaAnalysisRow): IdeaAnalysis => ({
  id: r.id, ideaId: r.idea_id,
  summary: r.summary ?? '', targetUserAnalysis: r.target_user_analysis ?? '',
  problemAnalysis: r.problem_analysis ?? '', marketPotential: r.market_potential ?? '',
  difficultyAnalysis: r.difficulty_analysis ?? '', risks: r.risks ?? '',
  mvpSuggestion: r.mvp_suggestion ?? '', validationPlan: r.validation_plan ?? '',
  nextSteps: r.next_steps ?? '',
  suggestedProject:      normalizeSuggestedProject(r.suggested_project),
  suggestedTasks:        normalizeSuggestedIdeaTasks(r.suggested_tasks),
  suggestedRisks:        normalizeSuggestedIdeaRisks(r.suggested_risks),
  suggestedRoadmapItems: normalizeSuggestedIdeaRoadmapItems(r.suggested_roadmap_items),
  createdAt: r.created_at,
})

export const toLink = (r: LinkRow): Link => ({
  id: r.id,
  sourceType: r.source_type as EntityType, sourceId: r.source_id,
  targetType: r.target_type as EntityType, targetId: r.target_id,
  relationshipType: r.relationship_type as Link['relationshipType'],
  description: r.description ?? '', createdAt: r.created_at,
})

export const toProjectFile = (r: ProjectFileRow): ProjectFile => ({
  id: r.id, projectId: r.project_id, fileName: r.file_name, filePath: r.file_path,
  fileType: r.file_type ?? '', fileSize: r.file_size ?? 0,
  summary: r.summary ?? '', extractedText: r.extracted_text ?? '',
  status: r.status as FileStatus, createdAt: r.created_at, updatedAt: r.updated_at,
})

export const toProjectReview = (r: ProjectReviewRow): ProjectReview => ({
  id: r.id, projectId: r.project_id,
  summary: r.summary ?? '', progressReview: r.progress_review ?? '',
  completedWork: r.completed_work ?? '', blockers: r.blockers ?? '',
  keyRisks: r.key_risks ?? '', keyDecisions: r.key_decisions ?? '',
  next7DayPlan: r.next_7_day_plan ?? '',
  suggestedTasks: normalizeSuggestedTasks(r.suggested_tasks),
  suggestedRoadmapItems: normalizeSuggestedRoadmapItems(r.suggested_roadmap_items),
  createdAt: r.created_at,
})

export const toWeeklyReview = (r: WeeklyReviewRow): WeeklyReview => ({
  id: r.id,
  weekStart: r.week_start,
  weekEnd: r.week_end,
  summary: r.summary ?? '',
  completedWork: r.completed_work ?? '',
  activeProjects: r.active_projects ?? '',
  stuckProjects: r.stuck_projects ?? '',
  keyDecisions: r.key_decisions ?? '',
  keyRisks: r.key_risks ?? '',
  ideasToRevisit: r.ideas_to_revisit ?? '',
  filesAdded: r.files_added ?? '',
  memoryInsights: r.memory_insights ?? '',
  nextWeekFocus: r.next_week_focus ?? '',
  suggestedTasks: normalizeSuggestedWeeklyTasks(r.suggested_tasks),
  suggestedProjectReviews: normalizeSuggestedProjectReviews(r.suggested_project_reviews),
  createdAt: r.created_at,
})

export const toProjectDna = (r: ProjectDnaRow): ProjectDna => ({
  id: r.id,
  projectId: r.project_id,
  origin: r.origin ?? '',
  coreGoal: r.core_goal ?? '',
  currentDirection: r.current_direction ?? '',
  majorDecisions: r.major_decisions ?? '',
  recurringRisks: r.recurring_risks ?? '',
  momentumPattern: r.momentum_pattern ?? '',
  lessonsLearned: r.lessons_learned ?? '',
  nextStrategicMove: r.next_strategic_move ?? '',
  dnaSummary: r.dna_summary ?? '',
  confidenceScore: r.confidence_score ?? 50,
  createdAt: r.created_at,
})

export const toPatternAnalysis = (r: PatternAnalysisRow): PatternAnalysis => ({
  id: r.id,
  summary: r.summary ?? '',
  recurringStrengths: r.recurring_strengths ?? '',
  recurringWeaknesses: r.recurring_weaknesses ?? '',
  executionPatterns: r.execution_patterns ?? '',
  ideaPatterns: r.idea_patterns ?? '',
  riskPatterns: r.risk_patterns ?? '',
  decisionPatterns: r.decision_patterns ?? '',
  projectMomentumPatterns: r.project_momentum_patterns ?? '',
  bottlenecks: r.bottlenecks ?? '',
  opportunities: r.opportunities ?? '',
  recommendedChanges: r.recommended_changes ?? '',
  suggestedActions: normalizeSuggestedPatternActions(r.suggested_actions),
  createdAt: r.created_at,
})

export const toGoal = (r: GoalRow): Goal => ({
  id: r.id,
  title: r.title,
  description: r.description ?? '',
  category: (r.category ?? 'Other') as GoalCategory,
  priority: (r.priority ?? 'Medium') as GoalPriority,
  status: (r.status ?? 'Active') as GoalStatus,
  progress: r.progress ?? 0,
  timeframe: r.timeframe ?? '',
  successCriteria: r.success_criteria ?? '',
  whyItMatters: r.why_it_matters ?? '',
  constraints: r.constraints ?? '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const toGoalLink = (r: GoalLinkRow): GoalLink => ({
  id: r.id,
  goalId: r.goal_id,
  entityType: r.entity_type,
  entityId: r.entity_id,
  relationshipType: r.relationship_type ?? 'supports',
  createdAt: r.created_at,
})

export const toGoalReview = (r: GoalReviewRow): GoalReview => ({
  id: r.id,
  goalId: r.goal_id,
  progressReview: r.progress_review ?? '',
  blockers: r.blockers ?? '',
  conflicts: r.conflicts ?? '',
  nextActions: r.next_actions ?? '',
  recommendedFocus: r.recommended_focus ?? '',
  confidenceScore: r.confidence_score ?? 50,
  suggestedTasks: normalizeSuggestedGoalTasks(r.suggested_tasks),
  createdAt: r.created_at,
})

