/**
 * POST /api/file-summary
 *
 * Summarises an uploaded project file using OpenAI and saves the result.
 * OPENAI_API_KEY stays server-side only.
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { loadProjectFile, loadProjectContext, updateProjectFile } from '@/lib/db'
import { indexProjectFile } from '@/lib/memory/indexing'
import { AI_MODEL } from '@/lib/ai'
import { FILE_SYSTEM_PROMPT } from '@/lib/file'

export const runtime = 'nodejs'

interface FileSummaryBody {
  project_id: string
  file_id: string
  extracted_text?: string
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  }

  let body: FileSummaryBody
  try {
    body = await req.json() as FileSummaryBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const projectId = body.project_id?.trim()
  const fileId = body.file_id?.trim()
  if (!projectId || !fileId) {
    return NextResponse.json({ error: 'project_id and file_id are required.' }, { status: 400 })
  }

  const file = await loadProjectFile(supabase, fileId)
  if (!file || file.projectId !== projectId) {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 })
  }

  const text = (body.extracted_text ?? file.extractedText).trim()
  if (!text) {
    return NextResponse.json({ error: 'No text content to summarise for this file.' }, { status: 400 })
  }

  const context = await loadProjectContext(supabase, projectId)
  if (!context) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  }

  await updateProjectFile(supabase, fileId, { status: 'Processing' })

  const openai = new OpenAI({ apiKey })

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.4,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: FILE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Project: ${context.project.title}
Goal: ${context.project.goal || '(none)'}
Description: ${context.project.description || '(none)'}

File name: ${file.fileName}
File type: ${file.fileType || 'unknown'}

File content:
${text.slice(0, 40000)}`,
        },
      ],
    })

    const summary = completion.choices[0]?.message?.content?.trim()
    if (!summary) {
      await updateProjectFile(supabase, fileId, { status: 'Failed' })
      return NextResponse.json({ error: 'The AI returned an empty summary.' }, { status: 502 })
    }

    const updated = await updateProjectFile(supabase, fileId, {
      summary,
      extractedText: text,
      status: 'Summarised',
    })

    void indexProjectFile(supabase, user.id, updated, context.project.title)
      .catch(err => console.error('[api/file-summary] memory index failed:', err))

    return NextResponse.json({ file: updated })
  } catch (err) {
    console.error('[api/file-summary] OpenAI error:', err)
    await updateProjectFile(supabase, fileId, { status: 'Failed' }).catch(() => {})
    const status = (err as { status?: number })?.status ?? 500
    const message =
      status === 429 ? 'Rate limit exceeded. Please try again shortly.' :
      'Could not generate the file summary. Please try again.'
    return NextResponse.json({ error: message }, { status })
  }
}
