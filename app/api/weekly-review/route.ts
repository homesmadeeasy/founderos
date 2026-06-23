/**
 * POST /api/weekly-review
 *
 * Generates a structured Global Weekly Review using OpenAI and saves it to the
 * weekly_reviews table. Everything runs server-side:
 *   1. Verify the user is authenticated (Supabase session from cookies).
 *   2. Load the user's workspace data (RLS scoped).
 *   3. Send concise context to OpenAI and ask for strict JSON.
 *   4. Normalise, insert into weekly_reviews, and return the saved review.
 *
 * NOTE: this project uses the `app/` directory (not `src/app/`), so the route
 * lives at app/api/weekly-review/route.ts.
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { loadGlobalWorkspaceContext, createWeeklyReview } from '@/lib/db'
import {
  AI_MODEL, WEEKLY_REVIEW_SYSTEM_PROMPT, renderWeeklyContext, normalizeWeeklyReview,
} from '@/lib/weekly-review'

export const runtime = 'nodejs'

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local.' },
      { status: 500 },
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to generate a weekly review.' }, { status: 401 })
  }

  let context
  try {
    context = await loadGlobalWorkspaceContext(supabase)
  } catch (err) {
    console.error('[api/weekly-review] failed to load workspace context:', err)
    return NextResponse.json({ error: 'Could not load workspace data.' }, { status: 500 })
  }

  const openai = new OpenAI({ apiKey })
  let fields
  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.4,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: WEEKLY_REVIEW_SYSTEM_PROMPT },
        { role: 'user', content: renderWeeklyContext(context) },
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

    fields = normalizeWeeklyReview(parsed)
  } catch (err) {
    if (err instanceof Error && err.message.includes('did not return an object')) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    const status = (err as { status?: number })?.status ?? 500
    const message =
      status === 401 ? 'Invalid OpenAI API key.' :
      status === 429 ? 'Rate limit or quota exceeded. Please try again shortly.' :
      'The AI service is unavailable right now. Please try again.'
    console.error('[api/weekly-review] OpenAI error:', err)
    return NextResponse.json({ error: message }, { status })
  }

  try {
    const review = await createWeeklyReview(
      supabase, user.id, context.weekStart, context.weekEnd, fields,
    )
    return NextResponse.json({ review })
  } catch (err) {
    console.error('[api/weekly-review] failed to save review:', err)
    return NextResponse.json({ error: 'The review was generated but could not be saved.' }, { status: 500 })
  }
}
