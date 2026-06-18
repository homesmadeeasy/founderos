/**
 * POST /api/chat
 *
 * Server-side OpenAI chat endpoint. The API key is read from the
 * OPENAI_API_KEY environment variable and never leaves the server.
 *
 * Request body: ChatRequestBody (see lib/ai.ts)
 * Response body: ChatResponseBody { reply: string }
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  AI_MODEL, SYSTEM_PROMPT, renderContextPrompt,
  type ChatRequestBody, type ChatHistoryMessage,
} from '@/lib/ai'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local.' },
      { status: 500 },
    )
  }

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { message, context, history } = body
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }

  const openai = new OpenAI({ apiKey })

  // Build the message list: system prompt + project context + recent history + new message
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ]

  if (context) {
    messages.push({ role: 'system', content: renderContextPrompt(context) })
  }

  for (const m of (history ?? []) as ChatHistoryMessage[]) {
    if (m.role === 'user' || m.role === 'assistant') {
      messages.push({ role: m.role, content: m.content })
    }
  }

  messages.push({ role: 'user', content: message })

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    })

    const reply = completion.choices[0]?.message?.content?.trim()
    if (!reply) {
      return NextResponse.json({ error: 'The AI returned an empty response.' }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message =
      status === 401 ? 'Invalid OpenAI API key.' :
      status === 429 ? 'Rate limit or quota exceeded. Please try again shortly.' :
      'The AI service is unavailable right now. Please try again.'
    console.error('[api/chat] OpenAI error:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
