/**
 * Server-only Founder AI service using OpenAI Responses API.
 * Do not import from client components.
 */

import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { getOptionalOpenAIApiKey } from '@/lib/env'
import { getFounderAIModel, FOUNDER_AI_TIMEOUT_MS } from './founderAI.config'
import { FOUNDER_AI_SYSTEM_PROMPT, buildFounderAIUserPrompt } from './founderAI.prompt'
import { FounderAIResponseSchema } from './founderAI.schema'
import { validateFounderAIResponse } from './founderAI.validation'
import type { CompactFounderContext, FounderAIErrorCode, FounderAIResponse } from './founderAI.types'

export interface FounderAIServiceResult {
  ok: boolean
  response?: FounderAIResponse
  errorCode?: FounderAIErrorCode
  providerMessage?: string
}

function readApiKey(): string | null {
  return getOptionalOpenAIApiKey()
}

function mapProviderError(err: unknown): { errorCode: FounderAIErrorCode; message: string } {
  const status = (err as { status?: number })?.status
  const name = (err as { name?: string })?.name ?? ''
  if (name === 'AbortError') return { errorCode: 'timeout', message: 'Request timed out.' }
  if (status === 429) return { errorCode: 'rate_limit', message: 'Rate limit exceeded.' }
  if (status === 401) return { errorCode: 'provider_error', message: 'Provider authentication failed.' }
  return { errorCode: 'provider_error', message: 'AI provider error.' }
}

export function isFounderAIAvailableOnServer(): boolean {
  return Boolean(readApiKey())
}

export async function runFounderAIService(
  context: CompactFounderContext,
  options?: { signal?: AbortSignal },
): Promise<FounderAIServiceResult> {
  const apiKey = readApiKey()
  if (!apiKey) {
    return { ok: false, errorCode: 'missing_key' }
  }

  const client = new OpenAI({ apiKey })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FOUNDER_AI_TIMEOUT_MS)
  const signal = options?.signal ?? controller.signal

  try {
    const contextJson = JSON.stringify(context)
    const parsed = await client.responses.parse({
      model: getFounderAIModel(),
      input: [
        { role: 'system', content: FOUNDER_AI_SYSTEM_PROMPT },
        { role: 'user', content: buildFounderAIUserPrompt(contextJson) },
      ],
      text: {
        format: zodTextFormat(FounderAIResponseSchema, 'founder_ai_response'),
      },
    }, { signal })

    const output = parsed.output_parsed
    if (!output) {
      return { ok: false, errorCode: 'invalid_model_output', providerMessage: 'Empty structured output.' }
    }

    const validated = validateFounderAIResponse(output, context)
    return { ok: true, response: validated }
  } catch (err) {
    const mapped = mapProviderError(err)
    return { ok: false, errorCode: mapped.errorCode, providerMessage: mapped.message }
  } finally {
    clearTimeout(timeout)
  }
}
