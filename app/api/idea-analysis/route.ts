/**
 * POST /api/idea-analysis
 *
 * Generates a structured Idea Analysis using OpenAI and saves it to the
 * idea_analyses table. Everything runs server-side:
 *   1. Verify the user is authenticated (Supabase session from cookies).
 *   2. Load the idea (RLS guarantees the user can only read their own).
 *   3. Send a concise idea context to OpenAI and ask for strict JSON.
 *   4. Normalise, insert into idea_analyses (RLS scopes to the user), and
 *      return the saved analysis.
 *
 * The OpenAI API key is read from OPENAI_API_KEY and never leaves the server.
 *
 * NOTE: this project uses the `app/` directory (not `src/app/`), so the route
 * lives at app/api/idea-analysis/route.ts.
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getOptionalOpenAIApiKey } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import { loadIdea, createIdeaAnalysis } from '@/lib/db'
import { indexIdeaAnalysis } from '@/lib/memory/indexing'
import {
  AI_MODEL, IDEA_SYSTEM_PROMPT, renderIdeaContext, normalizeIdeaAnalysis,
  type IdeaAnalysisRequestBody,
} from '@/lib/idea'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const apiKey = getOptionalOpenAIApiKey()
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
    return NextResponse.json({ error: 'You must be signed in to analyse an idea.' }, { status: 401 })
  }

  // Parse body
  let body: IdeaAnalysisRequestBody
  try {
    body = (await req.json()) as IdeaAnalysisRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const ideaId = body.idea_id?.trim()
  if (!ideaId) {
    return NextResponse.json({ error: 'idea_id is required.' }, { status: 400 })
  }

  // 2. Load the idea (RLS scopes to this user)
  let idea
  try {
    idea = await loadIdea(supabase, ideaId)
  } catch (err) {
    console.error('[api/idea-analysis] failed to load idea:', err)
    return NextResponse.json({ error: 'Could not load the idea.' }, { status: 500 })
  }
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found.' }, { status: 404 })
  }

  // 3. Ask OpenAI for a structured analysis
  const openai = new OpenAI({ apiKey })
  let fields
  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.5,
      max_tokens: 1600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: IDEA_SYSTEM_PROMPT },
        { role: 'user', content: renderIdeaContext(idea) },
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

    fields = normalizeIdeaAnalysis(parsed)
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message =
      status === 401 ? 'Invalid OpenAI API key.' :
      status === 429 ? 'Rate limit or quota exceeded. Please try again shortly.' :
      'The AI service is unavailable right now. Please try again.'
    console.error('[api/idea-analysis] OpenAI error:', err)
    return NextResponse.json({ error: message }, { status })
  }

  // 4. Save and return the analysis
  try {
    const analysis = await createIdeaAnalysis(supabase, user.id, ideaId, fields)
    void indexIdeaAnalysis(supabase, user.id, analysis, idea.title)
      .catch(err => console.error('[api/idea-analysis] memory index failed:', err))
    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('[api/idea-analysis] failed to save analysis:', err)
    return NextResponse.json({ error: 'The analysis was generated but could not be saved.' }, { status: 500 })
  }
}
