/**
 * Shared JSON parsing helpers for OpenAI structured responses.
 */

export function parseJsonResponse(rawText: string): unknown {
  const trimmed = rawText.trim()
  if (!trimmed) {
    throw new Error('The AI returned an empty response.')
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    throw new Error('The AI returned malformed JSON.')
  }
}

export function requireJsonObject(parsed: unknown, label = 'response'): Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`The AI ${label} was not a JSON object.`)
  }
  return parsed as Record<string, unknown>
}
