/**
 * POST /api/pattern-analysis
 *
 * Generates a cross-project pattern analysis using OpenAI and saves it to
 * pattern_analyses.
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { loadPatternAnalysisContext, createPatternAnalysis } from '@/lib/db'
import {
  AI_MODEL, PATTERN_ANALYSIS_SYSTEM_PROMPT, renderPatternAnalysisContext, normalizePatternAnalysis,
} from '@/lib/pattern-analysis'

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
    return NextResponse.json({ error: 'You must be signed in to generate pattern analysis.' }, { status: 401 })
  }

  let context
  try {
    context = await loadPatternAnalysisContext(supabase)
  } catch (err) {
    console.error('[api/pattern-analysis] failed to load context:', err)
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
        { role: 'system', content: PATTERN_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: renderPatternAnalysisContext(context) },
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

    fields = normalizePatternAnalysis(parsed)
  } catch (err) {
    if (err instanceof Error && err.message.includes('did not return an object')) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    const status = (err as { status?: number })?.status ?? 500
    const message =
      status === 401 ? 'Invalid OpenAI API key.' :
      status === 429 ? 'Rate limit or quota exceeded. Please try again shortly.' :
      'The AI service is unavailable right now. Please try again.'
    console.error('[api/pattern-analysis] OpenAI error:', err)
    return NextResponse.json({ error: message }, { status })
  }

  try {
    const analysis = await createPatternAnalysis(supabase, user.id, fields)
    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('[api/pattern-analysis] failed to save analysis:', err)
    return NextResponse.json({ error: 'Analysis was generated but could not be saved.' }, { status: 500 })
  }
}
