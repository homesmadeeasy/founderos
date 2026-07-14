import type { FounderAIApiEnvelope, FounderAIRequest } from './founderAI.types'

export interface FounderAIClientOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

export class FounderAIClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'FounderAIClientError'
  }
}

export async function requestFounderAI(
  body: FounderAIRequest,
  options?: FounderAIClientOptions,
): Promise<FounderAIApiEnvelope> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 30_000)
  const signal = options?.signal ?? controller.signal

  try {
    const res = await fetch('/api/ai/founder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })

    const json = await res.json() as FounderAIApiEnvelope & { error?: string }
    if (!res.ok) {
      throw new FounderAIClientError(
        json.error ?? json.warning ?? 'Founder AI request failed.',
        json.errorCode ?? 'provider_error',
        res.status,
      )
    }
    return json
  } catch (err) {
    if (err instanceof FounderAIClientError) throw err
    if ((err as { name?: string }).name === 'AbortError') {
      throw new FounderAIClientError('Request timed out.', 'timeout')
    }
    throw new FounderAIClientError('Network error contacting Founder AI.', 'provider_error')
  } finally {
    clearTimeout(timeout)
  }
}
