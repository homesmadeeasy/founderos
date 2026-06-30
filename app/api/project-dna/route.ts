/**
 * POST /api/project-dna
 *
 * Generates a Project DNA profile using OpenAI and saves it to project_dna.
 * Creates a memory graph link from project → project_dna.
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { loadProjectDnaContext, createProjectDna, createLink } from '@/lib/db'
import { indexProjectDNA } from '@/lib/memory/indexing'
import {
  AI_MODEL, PROJECT_DNA_SYSTEM_PROMPT, renderProjectDnaContext, normalizeProjectDna,
  type ProjectDnaRequestBody,
} from '@/lib/project-dna'

export const runtime = 'nodejs'

export async function POST(req: Request) {
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
    return NextResponse.json({ error: 'You must be signed in to generate Project DNA.' }, { status: 401 })
  }

  let body: ProjectDnaRequestBody
  try {
    body = (await req.json()) as ProjectDnaRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const projectId = body.project_id?.trim()
  if (!projectId) {
    return NextResponse.json({ error: 'project_id is required.' }, { status: 400 })
  }

  let context
  try {
    context = await loadProjectDnaContext(supabase, projectId)
  } catch (err) {
    console.error('[api/project-dna] failed to load context:', err)
    return NextResponse.json({ error: 'Could not load project data.' }, { status: 500 })
  }
  if (!context) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  }

  const openai = new OpenAI({ apiKey })
  let fields
  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROJECT_DNA_SYSTEM_PROMPT },
        { role: 'user', content: renderProjectDnaContext(context) },
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

    fields = normalizeProjectDna(parsed)
  } catch (err) {
    if (err instanceof Error && err.message.includes('did not return an object')) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    const status = (err as { status?: number })?.status ?? 500
    const message =
      status === 401 ? 'Invalid OpenAI API key.' :
      status === 429 ? 'Rate limit or quota exceeded. Please try again shortly.' :
      'The AI service is unavailable right now. Please try again.'
    console.error('[api/project-dna] OpenAI error:', err)
    return NextResponse.json({ error: message }, { status })
  }

  try {
    const dna = await createProjectDna(supabase, user.id, projectId, fields)
    try {
      await createLink(supabase, user.id, {
        sourceType: 'project',
        sourceId: projectId,
        targetType: 'project_dna',
        targetId: dna.id,
        relationshipType: 'part_of',
        description: 'Project DNA generated for this project',
      })
    } catch (linkErr) {
      console.error('[api/project-dna] failed to create memory link:', linkErr)
    }
    void indexProjectDNA(supabase, user.id, dna, context.project.title)
      .catch(err => console.error('[api/project-dna] memory index failed:', err))
    return NextResponse.json({ dna })
  } catch (err) {
    console.error('[api/project-dna] failed to save DNA:', err)
    return NextResponse.json({ error: 'DNA was generated but could not be saved.' }, { status: 500 })
  }
}
