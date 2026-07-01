import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { parseJsonBody, requireId } from '@/lib/api/validate'
import { getOpenAIApiKey, envErrorResponse } from '@/lib/env'
import { runJsonCompletion, mapOpenAIError } from '@/lib/ai/server'
import {
  loadGoalReviewContext, createGoalReview, loadGoals,
} from '@/lib/db'
import { toProject, type ProjectRow } from '@/lib/db/mappers'
import type { Project } from '@/lib/types'
import {
  GOAL_REVIEW_SYSTEM_PROMPT, renderGoalReviewContext, normalizeGoalReview,
  type GoalReviewRequestBody,
} from '@/lib/goal'
import { runSemanticSearch, formatMemoryResultsForContext } from '@/lib/memory/search'
import { indexGoalReview } from '@/lib/memory/indexing'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    getOpenAIApiKey()
  } catch (err) {
    return envErrorResponse(err)
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const parsed = await parseJsonBody<GoalReviewRequestBody>(req)
  if (!parsed.ok) return parsed.response

  const goalIdCheck = requireId(parsed.body.goal_id, 'goal_id')
  if (!goalIdCheck.ok) return goalIdCheck.response

  const supabase = await createClient()
  const goalId = goalIdCheck.value

  const ctx = await loadGoalReviewContext(supabase, goalId)
  if (!ctx) {
    return NextResponse.json({ error: 'Goal not found.' }, { status: 404 })
  }

  const allGoals = await loadGoals(supabase)
  const otherActiveGoals = allGoals.filter(
    g => g.id !== goalId && g.status === 'Active',
  )

  const { data: projectRows } = await supabase.from('projects').select('*')
  const linkedProjects: Project[] = ctx.links
    .filter(l => l.entityType === 'project')
    .map(l => (projectRows ?? []).find(p => p.id === l.entityId))
    .filter(Boolean)
    .map(p => toProject(p as ProjectRow))

  let linkedMemorySummaries: string[] = []
  try {
    const search = await runSemanticSearch(supabase, {
      query: `${ctx.goal.title} ${ctx.goal.successCriteria} ${ctx.goal.whyItMatters}`,
      userId: auth.user.id,
      limit: 6,
      similarityThreshold: 0.25,
    })
    linkedMemorySummaries = formatMemoryResultsForContext(search.results, 6)
  } catch {
    // Non-blocking
  }

  try {
    const fields = await runJsonCompletion(
      {
        system: GOAL_REVIEW_SYSTEM_PROMPT,
        user: renderGoalReviewContext({
          goal: ctx.goal,
          linkedProjects,
          linkedMemorySummaries,
          otherActiveGoals,
        }),
        temperature: 0.4,
        maxTokens: 1200,
      },
      normalizeGoalReview,
    )

    const review = await createGoalReview(supabase, auth.user.id, goalId, fields)
    void indexGoalReview(supabase, auth.user.id, review, ctx.goal.title)
      .catch(err => console.error('[api/goal-review] memory index failed:', err))

    return NextResponse.json({ review })
  } catch (err) {
    if (err instanceof Error && err.message.includes('object')) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    const { status, message } = mapOpenAIError(err)
    return NextResponse.json({ error: message }, { status })
  }
}
