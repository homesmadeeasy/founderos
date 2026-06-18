/**
 * POST /api/extract-object
 *
 * Uses OpenAI (server-side) to turn an assistant message into a clean,
 * structured object for a conversion modal (task | note | decision | risk | roadmap).
 *
 * The API key is read from OPENAI_API_KEY and never leaves the server.
 *
 * Request body:  ExtractRequestBody  { type, content }
 * Response body: ExtractResponseBody { fields }   (normalised, safe for the modal)
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { AI_MODEL } from '@/lib/ai'
import {
  buildSchemaInstruction, normalizeExtraction, EXTRACTION_TYPES,
  type ExtractRequestBody,
} from '@/lib/extract'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You extract structured project objects from assistant messages inside FounderOS.
You always respond with a single valid JSON object that matches the requested shape exactly.
Be concise and specific. Remove markdown formatting. Do not invent details that aren't supported by the message.`

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local.' },
      { status: 500 },
    )
  }

  let body: ExtractRequestBody
  try {
    body = (await req.json()) as ExtractRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { type, content } = body
  if (!type || !EXTRACTION_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid or missing object type.' }, { status: 400 })
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message content is required.' }, { status: 400 })
  }

  const openai = new OpenAI({ apiKey })

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${buildSchemaInstruction(type)}\n\nASSISTANT MESSAGE TO CONVERT:\n"""\n${content}\n"""`,
        },
      ],
    })

    const rawText = completion.choices[0]?.message?.content?.trim()
    if (!rawText) {
      return NextResponse.json({ error: 'The AI returned an empty response.' }, { status: 502 })
    }

    // Strict JSON parse with error handling
    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: 'The AI returned malformed JSON.' }, { status: 502 })
    }

    const fields = normalizeExtraction(type, parsed)
    return NextResponse.json({ fields })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message =
      status === 401 ? 'Invalid OpenAI API key.' :
      status === 429 ? 'Rate limit or quota exceeded.' :
      'The AI service is unavailable right now.'
    console.error('[api/extract-object] error:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
