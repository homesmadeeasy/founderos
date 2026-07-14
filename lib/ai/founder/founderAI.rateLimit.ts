/** Development-only in-memory rate limiter — replace with Redis/edge limiter in production. */

import { FOUNDER_AI_DEV_RATE_LIMIT } from './founderAI.config'

interface Bucket {
  count: number
  windowStart: number
}

const buckets = new Map<string, Bucket>()
const WINDOW_MS = 60_000

export function checkFounderAIRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const bucket = buckets.get(userId)
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(userId, { count: 1, windowStart: now })
    return { allowed: true }
  }
  if (bucket.count >= FOUNDER_AI_DEV_RATE_LIMIT) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - bucket.windowStart) }
  }
  bucket.count += 1
  return { allowed: true }
}

export function resetFounderAIRateLimitsForTests(): void {
  buckets.clear()
}
