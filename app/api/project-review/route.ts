import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { parseJsonBody, requireId } from '@/lib/api/validate'
import { runJsonCompletion, mapOpenAIError } from '@/lib/ai/server'
import { getOpenAIApiKey, envErrorResponse } from '@/lib/env'
import { loadProjectContext, createProjectReview, loadLinks, loadLatestProjectDna, loadLatestPatternAnalysis } from '@/lib/db'
import { toDnaSnapshot } from '@/lib/project-dna'
import { toPatternSnapshot } from '@/lib/pattern-analysis'
import {
  collectProjectEntityIds, getProjectLinks, buildLabelResolver, summarizeLinks,
} from '@/lib/links'
import type { AppState } from '@/lib/types'
import {
  REVIEW_SYSTEM_PROMPT, renderReviewContext, normalizeReview,
  type ProjectReviewRequestBody,
} from '@/lib/review'
import { runSemanticSearch, formatMemoryResultsForContext } from '@/lib/memory/search'
import { indexProjectReview } from '@/lib/memory/indexing'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    getOpenAIApiKey()
  } catch (err) {
    return envErrorResponse(err)
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const parsed = await parseJsonBody<ProjectReviewRequestBody>(req)
  if (!parsed.ok) return parsed.response

  const projectIdCheck = requireId(parsed.body.project_id, 'project_id')
  if (!projectIdCheck.ok) return projectIdCheck.response

  const supabase = await createClient()
  const projectId = projectIdCheck.value

  let context
  try {
    context = await loadProjectContext(supabase, projectId)
  } catch (err) {
    console.error('[api/project-review] failed to load project context:', err)
    return NextResponse.json({ error: 'Could not load project data.' }, { status: 500 })
  }
  if (!context) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  }

  try {
    const links = await loadLinks(supabase)
    const stateForLinks: AppState = {
      projects: [context.project],
      tasks: context.tasks, notes: context.notes, decisions: context.decisions,
      risks: context.risks, roadmapItems: context.roadmapItems,
      projectFiles: context.projectFiles ?? [], ideas: [],
      links, chatMessages: { [projectId]: context.messages },
    }
    const ids = collectProjectEntityIds(stateForLinks, projectId)
    context.linkedMemory = summarizeLinks(getProjectLinks(links, ids), buildLabelResolver(stateForLinks))
  } catch (err) {
    console.error('[api/project-review] failed to load linked memory:', err)
  }

  try {
    const latestDna = await loadLatestProjectDna(supabase, projectId)
    if (latestDna) context.projectDna = toDnaSnapshot(latestDna)
  } catch (err) {
    console.error('[api/project-review] failed to load project DNA:', err)
  }

  try {
    const latestPattern = await loadLatestPatternAnalysis(supabase)
    if (latestPattern) context.patternAnalysis = toPatternSnapshot(latestPattern)
  } catch (err) {
    console.error('[api/project-review] failed to load pattern analysis:', err)
  }

  try {
    const searchQuery = [context.project.goal, context.project.title, 'risks decisions blockers'].filter(Boolean).join(' ')
    const semantic = await runSemanticSearch(supabase, {
      query: searchQuery,
      userId: auth.user.id,
      projectId,
      limit: 5,
      similarityThreshold: 0.25,
    })
    context.semanticMemory = formatMemoryResultsForContext(semantic.results, 5)
  } catch (err) {
    console.error('[api/project-review] semantic memory skipped:', err)
  }

  try {
    const fields = await runJsonCompletion(
      {
        system: REVIEW_SYSTEM_PROMPT,
        user: renderReviewContext(context),
        temperature: 0.4,
        maxTokens: 1500,
      },
      normalizeReview,
    )
    const review = await createProjectReview(supabase, auth.user.id, projectId, fields)
    void indexProjectReview(supabase, auth.user.id, review, context.project.title)
      .catch(err => console.error('[api/project-review] memory index failed:', err))
    return NextResponse.json({ review })
  } catch (err) {
    if (err instanceof Error && (err.message.includes('JSON') || err.message.includes('empty'))) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    const { status, message } = mapOpenAIError(err)
    console.error('[api/project-review] OpenAI error:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
