import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/auth'
import { parseJsonBody, requireString } from '@/lib/api/validate'
import { createOpenAIClient, mapOpenAIError, AI_MODEL } from '@/lib/ai/server'
import { getOpenAIApiKey, envErrorResponse } from '@/lib/env'
import {
  SYSTEM_PROMPT, renderContextPrompt,
  type ChatRequestBody, type ChatHistoryMessage, MAX_HISTORY_MESSAGES,
} from '@/lib/ai'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    getOpenAIApiKey()
  } catch (err) {
    return envErrorResponse(err)
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const parsed = await parseJsonBody<ChatRequestBody>(req)
  if (!parsed.ok) return parsed.response

  const messageCheck = requireString(parsed.body.message, 'Message', { maxLength: 8_000 })
  if (!messageCheck.ok) return messageCheck.response

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ]
  if (parsed.body.context) {
    messages.push({ role: 'system', content: renderContextPrompt(parsed.body.context) })
  }
  for (const m of (parsed.body.history ?? []).slice(-MAX_HISTORY_MESSAGES) as ChatHistoryMessage[]) {
    if (m.role === 'user' || m.role === 'assistant') {
      messages.push({ role: m.role, content: m.content })
    }
  }
  messages.push({ role: 'user', content: messageCheck.value })

  try {
    const openai = createOpenAIClient()
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
    const { status, message } = mapOpenAIError(err)
    console.error('[api/chat] OpenAI error:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
