/**
 * Lightweight request validation for API routes.
 */

import { NextResponse } from 'next/server'

export async function parseJsonBody<T>(
  req: Request,
): Promise<{ ok: true; body: T } | { ok: false; response: NextResponse }> {
  try {
    const body = await req.json() as T
    return { ok: true, body }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }),
    }
  }
}

export function requireString(
  value: unknown,
  field: string,
  { minLength = 1, maxLength = 20_000 }: { minLength?: number; maxLength?: number } = {},
): { ok: true; value: string } | { ok: false; response: NextResponse } {
  if (typeof value !== 'string') {
    return {
      ok: false,
      response: NextResponse.json({ error: `${field} is required.` }, { status: 400 }),
    }
  }
  const trimmed = value.trim()
  if (trimmed.length < minLength) {
    return {
      ok: false,
      response: NextResponse.json({ error: `${field} is required.` }, { status: 400 }),
    }
  }
  if (trimmed.length > maxLength) {
    return {
      ok: false,
      response: NextResponse.json({ error: `${field} is too long.` }, { status: 400 }),
    }
  }
  return { ok: true, value: trimmed }
}

export function requireId(
  value: unknown,
  field: string,
): { ok: true; value: string } | { ok: false; response: NextResponse } {
  return requireString(value, field, { minLength: 1, maxLength: 128 })
}
