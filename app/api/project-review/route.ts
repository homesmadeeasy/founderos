/**
 * POST /api/project-review
 *
 * Generates a structured Project Review using OpenAI and saves it to the
 * project_reviews table. Everything runs server-side:
 *   1. Verify the user is authenticated (Supabase session from cookies).
 *   2. Load the project + its tasks/notes/decisions/risks/roadmap/recent chat
 *      (RLS guarantees the user can only read their own project).
 *   3. Send a concise context to OpenAI and ask for strict JSON.
 *   4. Normalise, insert into project_reviews (RLS scopes to the user), and
 *      return the saved review.
 *
 * The OpenAI API key is read from OPENAI_API_KEY and never leaves the server.
 *
 * NOTE: this project uses the `app/` directory (not `src/app/`), so the route
 * lives at app/api/project-review/route.ts.
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { loadProjectContext, createProjectReview, loadLinks } from '@/lib/db'
import {
  collectProjectEntityIds, getProjectLinks, buildLabelResolver, summarizeLinks,
} from '@/lib/links'
import type { AppState } from '@/lib/types'
import {
  AI_MODEL, REVIEW_SYSTEM_PROMPT, renderReviewContext, normalizeReview,
  type ProjectReviewRequestBody,
} from '@/lib/review'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local.' },
      { status: 500 },
    )
  }

  // 1. Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to generate a review.' }, { status: 401 })
  }

  // Parse body
  let body: ProjectReviewRequestBody
  try {
    body = (await req.json()) as ProjectReviewRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const projectId = body.project_id?.trim()
  if (!projectId) {
    return NextResponse.json({ error: 'project_id is required.' }, { status: 400 })
  }

  // 2. Load project context (RLS scopes to this user)
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

  // 2b. Load linked memory for this project (best-effort — never blocks a review).
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

  // 3. Ask OpenAI for a structured review
  const openai = new OpenAI({ apiKey })
  let fields
  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        { role: 'user', content: renderReviewContext(context) },
      ],
    })

    const rawText = completion.choices[0]?.message?.content?.trim()
    if (!rawText) {
      return NextResponse.json({ error: 'The AI returned an empty response.' }, { status: 502 })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: 'The AI returned malformed JSON.' }, { status: 502 })
    }

    fields = normalizeReview(parsed)
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message =
      status === 401 ? 'Invalid OpenAI API key.' :
      status === 429 ? 'Rate limit or quota exceeded. Please try again shortly.' :
      'The AI service is unavailable right now. Please try again.'
    console.error('[api/project-review] OpenAI error:', err)
    return NextResponse.json({ error: message }, { status })
  }

  // 4. Save and return the review
  try {
    const review = await createProjectReview(supabase, user.id, projectId, fields)
    return NextResponse.json({ review })
  } catch (err) {
    console.error('[api/project-review] failed to save review:', err)
    return NextResponse.json({ error: 'The review was generated but could not be saved.' }, { status: 500 })
  }
}
