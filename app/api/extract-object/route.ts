import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/auth'
import { parseJsonBody, requireString } from '@/lib/api/validate'
import { runJsonCompletion, mapOpenAIError } from '@/lib/ai/server'
import { getOpenAIApiKey, envErrorResponse } from '@/lib/env'
import {
  buildSchemaInstruction, normalizeExtraction, EXTRACTION_TYPES,
  type ExtractRequestBody,
} from '@/lib/extract'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You extract structured project objects from assistant messages inside FounderOS.
You always respond with a single valid JSON object that matches the requested shape exactly.
Be concise and specific. Remove markdown formatting. Do not invent details that aren't supported by the message.`

export async function POST(req: Request) {
  try {
    getOpenAIApiKey()
  } catch (err) {
    return envErrorResponse(err)
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const parsed = await parseJsonBody<ExtractRequestBody>(req)
  if (!parsed.ok) return parsed.response

  const { type, content } = parsed.body
  if (!type || !EXTRACTION_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid or missing object type.' }, { status: 400 })
  }

  const contentCheck = requireString(content, 'Message content', { maxLength: 12_000 })
  if (!contentCheck.ok) return contentCheck.response

  try {
    const fields = await runJsonCompletion(
      {
        system: SYSTEM_PROMPT,
        user: `${buildSchemaInstruction(type)}\n\nASSISTANT MESSAGE TO CONVERT:\n"""\n${contentCheck.value}\n"""`,
        temperature: 0.2,
        maxTokens: 400,
      },
      raw => normalizeExtraction(type, raw),
    )
    return NextResponse.json({ fields })
  } catch (err) {
    if (err instanceof Error && (err.message.includes('JSON') || err.message.includes('empty'))) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    const { status, message } = mapOpenAIError(err)
    console.error('[api/extract-object] error:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
