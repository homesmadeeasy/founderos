/**
 * Server-only memory indexing helpers.
 * Turn structured FounderOS entities into searchable embeddings.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Idea, IdeaAnalysis,
  ProjectReview, WeeklyReview, ProjectFile, ProjectDna, PatternAnalysis, Link,
  MemoryEntityType,
} from '@/lib/types'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { upsertMemoryEmbeddingRow, deleteMemoryEmbeddingRow } from '@/lib/db/embeddings'
import { loadAppState } from '@/lib/db/app-state'
import { loadProjectReviews } from '@/lib/db/reviews'
import { loadWeeklyReviews } from '@/lib/db/weekly-reviews'
import { loadLatestProjectDnaForAllProjects } from '@/lib/db/dna'
import { loadPatternAnalyses } from '@/lib/db/patterns'
import { loadIdeaAnalyses } from '@/lib/db/ideas'
import { describeLink, buildLabelResolver } from '@/lib/links'
import type { AppState } from '@/lib/types'

export const MIN_CONTENT_LENGTH = 20
export const PREVIEW_MAX_LENGTH = 200

export interface MemoryContentPayload {
  title: string | null
  content: string
  contentPreview: string
  projectId: string | null
  metadata: Record<string, unknown>
}

export function buildContentPreview(text: string, max = PREVIEW_MAX_LENGTH): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function isIndexable(content: string): boolean {
  return content.replace(/\s+/g, ' ').trim().length >= MIN_CONTENT_LENGTH
}

function joinParts(parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join('\n').trim()
}

// ─── Content builders ─────────────────────────────────────────────────────────

export function buildMemoryContentForProject(project: Project): MemoryContentPayload | null {
  const content = joinParts([
    `Project: ${project.title}`,
    project.description && `Description: ${project.description}`,
    project.goal && `Goal: ${project.goal}`,
    `Status: ${project.status}`,
    `Priority: ${project.priority}`,
    `Progress: ${project.progress}%`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: project.title,
    content,
    contentPreview: buildContentPreview(content),
    projectId: project.id,
    metadata: { status: project.status, priority: project.priority },
  }
}

export function buildMemoryContentForIdea(idea: Idea): MemoryContentPayload | null {
  const content = joinParts([
    `Idea: ${idea.title}`,
    idea.description && `Description: ${idea.description}`,
    idea.problem && `Problem: ${idea.problem}`,
    idea.solution && `Solution: ${idea.solution}`,
    idea.targetUser && `Target user: ${idea.targetUser}`,
    idea.tags.length ? `Tags: ${idea.tags.join(', ')}` : '',
    `Status: ${idea.status}`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: idea.title,
    content,
    contentPreview: buildContentPreview(content),
    projectId: null,
    metadata: { status: idea.status },
  }
}

export function buildMemoryContentForIdeaAnalysis(analysis: IdeaAnalysis, ideaTitle: string): MemoryContentPayload | null {
  const content = joinParts([
    `Idea analysis for: ${ideaTitle}`,
    analysis.summary && `Summary: ${analysis.summary}`,
    analysis.problemAnalysis && `Problem: ${analysis.problemAnalysis}`,
    analysis.marketPotential && `Market: ${analysis.marketPotential}`,
    analysis.risks && `Risks: ${analysis.risks}`,
    analysis.nextSteps && `Next steps: ${analysis.nextSteps}`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: `Analysis: ${ideaTitle}`,
    content,
    contentPreview: buildContentPreview(content),
    projectId: null,
    metadata: { ideaId: analysis.ideaId },
  }
}

export function buildMemoryContentForTask(task: Task, projectTitle?: string): MemoryContentPayload | null {
  const content = joinParts([
    projectTitle && `Project: ${projectTitle}`,
    `Task: ${task.title}`,
    task.description && `Description: ${task.description}`,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: task.title,
    content,
    contentPreview: buildContentPreview(content),
    projectId: task.projectId,
    metadata: { status: task.status, priority: task.priority },
  }
}

export function buildMemoryContentForNote(note: Note, projectTitle?: string): MemoryContentPayload | null {
  const content = joinParts([
    projectTitle && `Project: ${projectTitle}`,
    `Note: ${note.title}`,
    note.content,
  ])
  if (!isIndexable(content)) return null
  return {
    title: note.title,
    content,
    contentPreview: buildContentPreview(content),
    projectId: note.projectId,
    metadata: {},
  }
}

export function buildMemoryContentForDecision(decision: Decision, projectTitle?: string): MemoryContentPayload | null {
  const content = joinParts([
    projectTitle && `Project: ${projectTitle}`,
    `Decision: ${decision.decision}`,
    decision.reasoning && `Reasoning: ${decision.reasoning}`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: decision.decision,
    content,
    contentPreview: buildContentPreview(content),
    projectId: decision.projectId,
    metadata: {},
  }
}

export function buildMemoryContentForRisk(risk: Risk, projectTitle?: string): MemoryContentPayload | null {
  const content = joinParts([
    projectTitle && `Project: ${projectTitle}`,
    `Risk: ${risk.title}`,
    risk.description && `Description: ${risk.description}`,
    risk.mitigation && `Mitigation: ${risk.mitigation}`,
    `Severity: ${risk.severity}`,
    `Status: ${risk.status}`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: risk.title,
    content,
    contentPreview: buildContentPreview(content),
    projectId: risk.projectId,
    metadata: { severity: risk.severity, status: risk.status },
  }
}

export function buildMemoryContentForRoadmapItem(item: RoadmapItem, projectTitle?: string): MemoryContentPayload | null {
  const content = joinParts([
    projectTitle && `Project: ${projectTitle}`,
    `Roadmap item: ${item.title}`,
    item.description && `Description: ${item.description}`,
    `Stage: ${item.stage}`,
    `Status: ${item.status}`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: item.title,
    content,
    contentPreview: buildContentPreview(content),
    projectId: item.projectId,
    metadata: { stage: item.stage, status: item.status },
  }
}

export function buildMemoryContentForProjectReview(review: ProjectReview, projectTitle?: string): MemoryContentPayload | null {
  const content = joinParts([
    projectTitle && `Project: ${projectTitle}`,
    `Project review summary: ${review.summary}`,
    review.progressReview && `Progress: ${review.progressReview}`,
    review.blockers && `Blockers: ${review.blockers}`,
    review.keyRisks && `Key risks: ${review.keyRisks}`,
    review.keyDecisions && `Key decisions: ${review.keyDecisions}`,
    review.next7DayPlan && `Next 7 days: ${review.next7DayPlan}`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: buildContentPreview(review.summary, 80),
    content,
    contentPreview: buildContentPreview(content),
    projectId: review.projectId,
    metadata: {},
  }
}

export function buildMemoryContentForWeeklyReview(review: WeeklyReview): MemoryContentPayload | null {
  const content = joinParts([
    `Weekly review (${review.weekStart} – ${review.weekEnd})`,
    review.summary && `Summary: ${review.summary}`,
    review.stuckProjects && `Stuck projects: ${review.stuckProjects}`,
    review.keyRisks && `Key risks: ${review.keyRisks}`,
    review.keyDecisions && `Key decisions: ${review.keyDecisions}`,
    review.nextWeekFocus && `Next week focus: ${review.nextWeekFocus}`,
    review.memoryInsights && `Memory insights: ${review.memoryInsights}`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: buildContentPreview(review.summary, 80) || 'Weekly review',
    content,
    contentPreview: buildContentPreview(content),
    projectId: null,
    metadata: { weekStart: review.weekStart, weekEnd: review.weekEnd },
  }
}

export function buildMemoryContentForProjectFile(file: ProjectFile, projectTitle?: string): MemoryContentPayload | null {
  const content = joinParts([
    projectTitle && `Project: ${projectTitle}`,
    `File: ${file.fileName}`,
    file.summary ? `Summary: ${file.summary}` : (file.extractedText ? file.extractedText.slice(0, 2000) : undefined),
  ])
  if (!isIndexable(content)) return null
  return {
    title: file.fileName,
    content,
    contentPreview: buildContentPreview(content),
    projectId: file.projectId,
    metadata: { fileType: file.fileType, status: file.status },
  }
}

export function buildMemoryContentForProjectDna(dna: ProjectDna, projectTitle?: string): MemoryContentPayload | null {
  const content = joinParts([
    projectTitle && `Project: ${projectTitle}`,
    `Project DNA: ${dna.dnaSummary}`,
    dna.coreGoal && `Core goal: ${dna.coreGoal}`,
    dna.currentDirection && `Direction: ${dna.currentDirection}`,
    dna.recurringRisks && `Recurring risks: ${dna.recurringRisks}`,
    dna.lessonsLearned && `Lessons: ${dna.lessonsLearned}`,
    dna.nextStrategicMove && `Next move: ${dna.nextStrategicMove}`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: buildContentPreview(dna.dnaSummary, 80) || 'Project DNA',
    content,
    contentPreview: buildContentPreview(content),
    projectId: dna.projectId,
    metadata: { confidenceScore: dna.confidenceScore },
  }
}

export function buildMemoryContentForPatternAnalysis(analysis: PatternAnalysis): MemoryContentPayload | null {
  const content = joinParts([
    `Cross-project pattern analysis: ${analysis.summary}`,
    analysis.bottlenecks && `Bottlenecks: ${analysis.bottlenecks}`,
    analysis.riskPatterns && `Risk patterns: ${analysis.riskPatterns}`,
    analysis.decisionPatterns && `Decision patterns: ${analysis.decisionPatterns}`,
    analysis.recommendedChanges && `Recommendations: ${analysis.recommendedChanges}`,
  ])
  if (!isIndexable(content)) return null
  return {
    title: buildContentPreview(analysis.summary, 80) || 'Pattern analysis',
    content,
    contentPreview: buildContentPreview(content),
    projectId: null,
    metadata: {},
  }
}

export function buildMemoryContentForLink(link: Link, state: AppState): MemoryContentPayload | null {
  const resolve = buildLabelResolver(state)
  const description = describeLink(link, resolve)
  const content = joinParts([
    'Memory link:',
    description,
    link.description && `Note: ${link.description}`,
  ])
  if (!isIndexable(content)) return null

  const projectId =
    link.sourceType === 'project' ? link.sourceId :
    link.targetType === 'project' ? link.targetId :
    state.tasks.find(t => t.id === link.sourceId || t.id === link.targetId)?.projectId ??
    state.notes.find(n => n.id === link.sourceId || n.id === link.targetId)?.projectId ??
    null

  return {
    title: buildContentPreview(description, 80),
    content,
    contentPreview: buildContentPreview(content),
    projectId,
    metadata: {
      relationshipType: link.relationshipType,
      sourceType: link.sourceType,
      targetType: link.targetType,
    },
  }
}

export function buildMemoryContentForMessage(
  content: string,
  projectId: string,
  projectTitle?: string,
  role?: string,
): MemoryContentPayload | null {
  const text = joinParts([
    projectTitle && `Project: ${projectTitle}`,
    role && `Role: ${role}`,
    content,
  ])
  if (!isIndexable(text)) return null
  return {
    title: buildContentPreview(content, 80),
    content: text,
    contentPreview: buildContentPreview(text),
    projectId,
    metadata: { role },
  }
}

// ─── Upsert / delete ──────────────────────────────────────────────────────────

export async function upsertMemoryEmbedding(
  supabase: SupabaseClient,
  userId: string,
  entityType: MemoryEntityType,
  entityId: string,
  payload: MemoryContentPayload,
): Promise<boolean> {
  try {
    const embedding = await generateEmbedding(payload.content)
    await upsertMemoryEmbeddingRow(supabase, {
      userId,
      entityType,
      entityId,
      projectId: payload.projectId,
      title: payload.title,
      content: payload.content,
      contentPreview: payload.contentPreview,
      metadata: payload.metadata,
      embedding,
    })
    return true
  } catch (err) {
    console.error(`[memory/index] failed to index ${entityType}/${entityId}:`, err)
    return false
  }
}

export async function deleteMemoryEmbedding(
  supabase: SupabaseClient,
  userId: string,
  entityType: MemoryEntityType,
  entityId: string,
): Promise<void> {
  await deleteMemoryEmbeddingRow(supabase, userId, entityType, entityId)
}

// ─── Entity indexers ──────────────────────────────────────────────────────────

export async function indexProject(supabase: SupabaseClient, userId: string, project: Project): Promise<boolean> {
  const payload = buildMemoryContentForProject(project)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'project', project.id, payload)
}

export async function indexIdea(supabase: SupabaseClient, userId: string, idea: Idea): Promise<boolean> {
  const payload = buildMemoryContentForIdea(idea)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'idea', idea.id, payload)
}

export async function indexTask(supabase: SupabaseClient, userId: string, task: Task, projectTitle?: string): Promise<boolean> {
  const payload = buildMemoryContentForTask(task, projectTitle)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'task', task.id, payload)
}

export async function indexNote(supabase: SupabaseClient, userId: string, note: Note, projectTitle?: string): Promise<boolean> {
  const payload = buildMemoryContentForNote(note, projectTitle)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'note', note.id, payload)
}

export async function indexDecision(supabase: SupabaseClient, userId: string, decision: Decision, projectTitle?: string): Promise<boolean> {
  const payload = buildMemoryContentForDecision(decision, projectTitle)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'decision', decision.id, payload)
}

export async function indexRisk(supabase: SupabaseClient, userId: string, risk: Risk, projectTitle?: string): Promise<boolean> {
  const payload = buildMemoryContentForRisk(risk, projectTitle)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'risk', risk.id, payload)
}

export async function indexRoadmapItem(supabase: SupabaseClient, userId: string, item: RoadmapItem, projectTitle?: string): Promise<boolean> {
  const payload = buildMemoryContentForRoadmapItem(item, projectTitle)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'roadmap_item', item.id, payload)
}

export async function indexProjectReview(supabase: SupabaseClient, userId: string, review: ProjectReview, projectTitle?: string): Promise<boolean> {
  const payload = buildMemoryContentForProjectReview(review, projectTitle)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'project_review', review.id, payload)
}

export async function indexWeeklyReview(supabase: SupabaseClient, userId: string, review: WeeklyReview): Promise<boolean> {
  const payload = buildMemoryContentForWeeklyReview(review)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'weekly_review', review.id, payload)
}

export async function indexProjectFile(supabase: SupabaseClient, userId: string, file: ProjectFile, projectTitle?: string): Promise<boolean> {
  const payload = buildMemoryContentForProjectFile(file, projectTitle)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'project_file', file.id, payload)
}

export async function indexProjectDNA(supabase: SupabaseClient, userId: string, dna: ProjectDna, projectTitle?: string): Promise<boolean> {
  const payload = buildMemoryContentForProjectDna(dna, projectTitle)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'project_dna', dna.id, payload)
}

export async function indexPatternAnalysis(supabase: SupabaseClient, userId: string, analysis: PatternAnalysis): Promise<boolean> {
  const payload = buildMemoryContentForPatternAnalysis(analysis)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'pattern_analysis', analysis.id, payload)
}

export async function indexIdeaAnalysis(
  supabase: SupabaseClient,
  userId: string,
  analysis: IdeaAnalysis,
  ideaTitle: string,
): Promise<boolean> {
  const payload = buildMemoryContentForIdeaAnalysis(analysis, ideaTitle)
  if (!payload) return false
  return upsertMemoryEmbedding(supabase, userId, 'idea_analysis', analysis.id, payload)
}

// ─── Index by entity id (for auto-index API) ──────────────────────────────────

export async function indexEntityById(
  supabase: SupabaseClient,
  userId: string,
  entityType: MemoryEntityType,
  entityId: string,
): Promise<boolean> {
  const state = await loadAppState(supabase)
  const projectMap = new Map(state.projects.map(p => [p.id, p.title]))
  const projectTitle = (id: string) => projectMap.get(id)

  switch (entityType) {
    case 'project': {
      const project = state.projects.find(p => p.id === entityId)
      return project ? indexProject(supabase, userId, project) : false
    }
    case 'idea': {
      const idea = state.ideas.find(i => i.id === entityId)
      return idea ? indexIdea(supabase, userId, idea) : false
    }
    case 'task': {
      const task = state.tasks.find(t => t.id === entityId)
      return task ? indexTask(supabase, userId, task, projectTitle(task.projectId)) : false
    }
    case 'note': {
      const note = state.notes.find(n => n.id === entityId)
      return note ? indexNote(supabase, userId, note, projectTitle(note.projectId)) : false
    }
    case 'decision': {
      const d = state.decisions.find(x => x.id === entityId)
      return d ? indexDecision(supabase, userId, d, projectTitle(d.projectId)) : false
    }
    case 'risk': {
      const r = state.risks.find(x => x.id === entityId)
      return r ? indexRisk(supabase, userId, r, projectTitle(r.projectId)) : false
    }
    case 'roadmap_item': {
      const item = state.roadmapItems.find(x => x.id === entityId)
      return item ? indexRoadmapItem(supabase, userId, item, projectTitle(item.projectId)) : false
    }
    case 'project_file': {
      const file = state.projectFiles.find(f => f.id === entityId)
      return file ? indexProjectFile(supabase, userId, file, projectTitle(file.projectId)) : false
    }
    case 'project_review': {
      for (const p of state.projects) {
        const reviews = await loadProjectReviews(supabase, p.id)
        const review = reviews.find(r => r.id === entityId)
        if (review) return indexProjectReview(supabase, userId, review, p.title)
      }
      return false
    }
    case 'weekly_review': {
      const reviews = await loadWeeklyReviews(supabase)
      const review = reviews.find(r => r.id === entityId)
      return review ? indexWeeklyReview(supabase, userId, review) : false
    }
    case 'project_dna': {
      const records = await loadLatestProjectDnaForAllProjects(supabase)
      const dna = records.find(d => d.id === entityId)
      return dna ? indexProjectDNA(supabase, userId, dna, projectTitle(dna.projectId)) : false
    }
    case 'pattern_analysis': {
      const analyses = await loadPatternAnalyses(supabase)
      const analysis = analyses.find(a => a.id === entityId)
      return analysis ? indexPatternAnalysis(supabase, userId, analysis) : false
    }
    case 'idea_analysis': {
      for (const idea of state.ideas) {
        const analyses = await loadIdeaAnalyses(supabase, idea.id)
        const analysis = analyses.find(a => a.id === entityId)
        if (analysis) return indexIdeaAnalysis(supabase, userId, analysis, idea.title)
      }
      return false
    }
    case 'link': {
      const link = state.links.find(l => l.id === entityId)
      if (!link) return false
      const payload = buildMemoryContentForLink(link, state)
      if (!payload) return false
      return upsertMemoryEmbedding(supabase, userId, 'link', link.id, payload)
    }
    case 'message': {
      for (const [pid, messages] of Object.entries(state.chatMessages)) {
        const msg = messages.find(m => m.id === entityId)
        if (msg) {
          const payload = buildMemoryContentForMessage(msg.content, pid, projectTitle(pid), msg.role)
          if (!payload) return false
          return upsertMemoryEmbedding(supabase, userId, 'message', msg.id, payload)
        }
      }
      return false
    }
    default:
      return false
  }
}

// ─── Full reindex ─────────────────────────────────────────────────────────────

export async function reindexAllUserMemory(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const state = await loadAppState(supabase)
  const projectMap = new Map(state.projects.map(p => [p.id, p.title]))
  const pt = (id: string) => projectMap.get(id)
  let count = 0

  for (const project of state.projects) {
    if (await indexProject(supabase, userId, project)) count++
  }
  for (const idea of state.ideas) {
    if (await indexIdea(supabase, userId, idea)) count++
    const analyses = await loadIdeaAnalyses(supabase, idea.id)
    for (const analysis of analyses) {
      const payload = buildMemoryContentForIdeaAnalysis(analysis, idea.title)
      if (payload && await upsertMemoryEmbedding(supabase, userId, 'idea_analysis', analysis.id, payload)) count++
    }
  }
  for (const task of state.tasks) {
    if (await indexTask(supabase, userId, task, pt(task.projectId))) count++
  }
  for (const note of state.notes) {
    if (await indexNote(supabase, userId, note, pt(note.projectId))) count++
  }
  for (const decision of state.decisions) {
    if (await indexDecision(supabase, userId, decision, pt(decision.projectId))) count++
  }
  for (const risk of state.risks) {
    if (await indexRisk(supabase, userId, risk, pt(risk.projectId))) count++
  }
  for (const item of state.roadmapItems) {
    if (await indexRoadmapItem(supabase, userId, item, pt(item.projectId))) count++
  }
  for (const file of state.projectFiles) {
    if (file.status === 'Summarised' || file.summary || file.extractedText) {
      if (await indexProjectFile(supabase, userId, file, pt(file.projectId))) count++
    }
  }
  for (const link of state.links) {
    const payload = buildMemoryContentForLink(link, state)
    if (payload && await upsertMemoryEmbedding(supabase, userId, 'link', link.id, payload)) count++
  }

  for (const project of state.projects) {
    const reviews = await loadProjectReviews(supabase, project.id)
    for (const review of reviews) {
      if (await indexProjectReview(supabase, userId, review, project.title)) count++
    }
  }

  const weeklyReviews = await loadWeeklyReviews(supabase)
  for (const review of weeklyReviews) {
    if (await indexWeeklyReview(supabase, userId, review)) count++
  }

  const dnaRecords = await loadLatestProjectDnaForAllProjects(supabase)
  for (const dna of dnaRecords) {
    if (await indexProjectDNA(supabase, userId, dna, pt(dna.projectId))) count++
  }

  const patterns = await loadPatternAnalyses(supabase)
  for (const analysis of patterns) {
    if (await indexPatternAnalysis(supabase, userId, analysis)) count++
  }

  return count
}
