/**
 * Server-only OpenAI helpers.
 * Do not import from client components.
 */

import OpenAI from 'openai'
import { getOpenAIApiKey } from '@/lib/env'
import { AI_MODEL } from '@/lib/ai'
import { parseJsonResponse } from '@/lib/ai/json'

export { AI_MODEL }

export function createOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: getOpenAIApiKey() })
}

export function mapOpenAIError(err: unknown): { status: number; message: string } {
  const status = (err as { status?: number })?.status ?? 500
  const message =
    status === 401 ? 'Invalid OpenAI API key.' :
    status === 429 ? 'Rate limit or quota exceeded. Please try again shortly.' :
    'The AI service is unavailable right now. Please try again.'
  return { status, message }
}

export interface ChatCompletionOptions {
  system: string | string[]
  user: string
  temperature?: number
  maxTokens?: number
  json?: boolean
}

/** Run a chat completion and return trimmed text content. */
export async function runChatCompletion(options: ChatCompletionOptions): Promise<string> {
  const openai = createOpenAIClient()
  const systemMessages = Array.isArray(options.system) ? options.system : [options.system]

  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxTokens ?? 1500,
    ...(options.json ? { response_format: { type: 'json_object' as const } } : {}),
    messages: [
      ...systemMessages.map(content => ({ role: 'system' as const, content })),
      { role: 'user' as const, content: options.user },
    ],
  })

  const text = completion.choices[0]?.message?.content?.trim()
  if (!text) throw new Error('The AI returned an empty response.')
  return text
}

/** Run a JSON-mode completion, parse, and pass to normalizer. */
export async function runJsonCompletion<T>(
  options: Omit<ChatCompletionOptions, 'json'>,
  normalize: (parsed: unknown) => T,
): Promise<T> {
  const raw = await runChatCompletion({ ...options, json: true })
  return normalize(parseJsonResponse(raw))
}
