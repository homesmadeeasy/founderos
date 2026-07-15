import type { RealityClaim, RealitySourceClass } from './realityTypes'
import { newCognitiveId, nowISO } from './cognitiveUtils'

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}

function wordToNumber(text: string): number | null {
  const lower = text.toLowerCase()
  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) return num
  }
  return null
}

export function parseTesterCount(text: string): number | null {
  const lower = text.toLowerCase()

  const priorityPatterns = [
    /(?:^|[.;]\s*)(?:(\d+)|(one|two|three|four|five|six|seven|eight|nine|ten))\s+people\s+tested/i,
    /(?:showed|gave|tested|shared|sent)\s+(?:it\s+)?(?:to\s+)?(?:(\d+)|(one|two|three|four|five|six|seven|eight|nine|ten))\s+people/i,
    /(?:^|[.;]\s*)(?:(\d+)|(one|two|three|four|five|six|seven|eight|nine|ten))\s+(people|users|students|testers|persons?)\b/i,
  ]
  for (const pattern of priorityPatterns) {
    const match = text.match(pattern)
    if (match) {
      const parsed = parseInt(match[1], 10)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
      const word = wordToNumber(match[1] ?? match[2] ?? '')
      if (word) return word
    }
  }

  const patterns = [
    /(\d+)\s+tested\b/i,
    /^(\d+)$/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const parsed = parseInt(match[1], 10)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }

  if (/people|users|testers|person|showed|tested/i.test(lower)) {
    const wordOnly = wordToNumber(lower)
    if (wordOnly) return wordOnly
  }
  return null
}

function parsePositiveCount(text: string, total: number | null): number | null {
  const patterns = [
    /(\d+)\s*(?:out\s+of\s*(\d+)|\/(\d+))?\s*(?:people\s+)?(?:understood|got\s+it|saw\s+the\s+value|liked|valued|comprehended)/i,
    /(one|two|three|four|five)\s+(?:people\s+)?(?:understood|got\s+it|saw\s+the\s+value)/i,
    /(\d+)\s+understood/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const n = parseInt(match[1], 10)
      if (Number.isFinite(n)) return n
      const word = wordToNumber(match[1] ?? '')
      if (word) return word
    }
  }
  if (/most\s+understood|majority\s+understood/i.test(text) && total) {
    return Math.ceil(total * 0.6)
  }
  return null
}

function parseNegativeCount(text: string, total: number | null): number | null {
  const patterns = [
    /(\d+)\s*(?:out\s+of\s*(\d+)|\/(\d+))?\s*(?:people\s+)?(?:thought|saw|interpreted|called|said).*(?:dashboard|productivity|confus)/i,
    /(one|two|three|four|five)\s+(?:people\s+)?(?:thought|were\s+confused|didn't\s+understand)/i,
    /(\d+)\s+(?:were\s+confused|thought\s+it)/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const n = parseInt(match[1], 10)
      if (Number.isFinite(n)) return n
      const word = wordToNumber(match[1] ?? '')
      if (word) return word
    }
  }
  if (/two\s+thought|2\s+thought/i.test(text)) return 2
  if (/some\s+people\s+thought|some\s+were\s+confused/i.test(text)) {
    return total ? Math.max(1, Math.floor(total * 0.3)) : 1
  }
  return null
}

export function parseTestedSurface(text: string): string | null {
  const lower = text.toLowerCase()
  if (/home\s*page|homepage|\bhome\b/i.test(lower)) return 'home_page'
  const surfaces = ['founder', 'domains', 'morning', 'evening', 'capture', 'memory', 'dashboard']
  for (const s of surfaces) {
    if (lower.includes(s)) return s
  }
  return null
}

function hasValidationOccurred(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    parseTesterCount(text) !== null
    || /tested|showed\s+it|user\s+feedback|real\s+users?|people\s+(saw|used|tried)/i.test(lower)
  )
}

function hasPositioningIssue(text: string): boolean {
  return /dashboard|productivity|another\s+app|confus|unclear|didn't\s+understand|messaging|positioning/i.test(text)
}

function hasValueComprehension(text: string): boolean {
  return /understood|decide\s+what\s+matters|value|comprehend|got\s+it|saw\s+the\s+point/i.test(text)
}

function claim(
  predicate: string,
  value: string | number | boolean,
  confidence: number,
  source: RealitySourceClass,
  rawText: string,
  entityId?: string,
): RealityClaim {
  return {
    id: newCognitiveId('claim'),
    predicate,
    entityId,
    value,
    confidence,
    source,
    rawText: rawText.slice(0, 200),
    recordedAt: nowISO(),
  }
}

export function normalizeClaimKey(c: Pick<RealityClaim, 'predicate' | 'entityId' | 'value'>): string {
  return `${c.predicate}:${c.entityId ?? 'global'}:${String(c.value).toLowerCase().trim()}`
}

export function buildIdempotencyKey(sessionId: string, messageId: string, claimKey: string): string {
  return `${sessionId}:${messageId}:${claimKey}`
}

/** Dedupes identical user text within a session even when messageId differs (e.g. resend). */
export function buildContentIdempotencyKey(sessionId: string, userMessage: string, claimKey: string): string {
  const normalized = userMessage.trim().toLowerCase().replace(/\s+/g, ' ')
  return `${sessionId}:content:${normalized}:${claimKey}`
}

export function extractClaimsFromText(text: string): RealityClaim[] {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length < 3) return []

  const claims: RealityClaim[] = []
  const testerCount = parseTesterCount(trimmed)
  const surface = parseTestedSurface(trimmed)
  const positiveCount = parsePositiveCount(trimmed, testerCount)
  const negativeCount = parseNegativeCount(trimmed, testerCount)

  if (testerCount !== null) {
    claims.push(claim('validation.tester_count', testerCount, 0.78, 'user_reported', trimmed))
    claims.push(claim('validation.users_tested', true, 0.82, 'user_reported', trimmed))
  } else if (hasValidationOccurred(trimmed)) {
    claims.push(claim('validation.users_tested', true, 0.65, 'user_reported', trimmed))
  }

  if (surface) {
    claims.push(claim('validation.tested_surface', surface, 0.75, 'user_reported', trimmed, surface))
  }

  if (positiveCount !== null) {
    claims.push(claim('validation.comprehension_positive', positiveCount, 0.74, 'user_reported', trimmed))
  } else if (hasValueComprehension(trimmed) && !negativeCount) {
    claims.push(claim('validation.comprehension_positive', 1, 0.55, 'user_reported', trimmed))
  }

  if (negativeCount !== null) {
    claims.push(claim('validation.comprehension_negative', negativeCount, 0.76, 'user_reported', trimmed))
    claims.push(claim('product.positioning_weak', true, 0.72, 'user_reported', trimmed))
  } else if (hasPositioningIssue(trimmed)) {
    claims.push(claim('product.positioning_weak', true, 0.68, 'user_reported', trimmed))
  }

  if (testerCount && positiveCount !== null) {
    const rate = Math.round((positiveCount / testerCount) * 100)
    if (rate > 0 && rate <= 100) {
      claims.push(claim('validation.comprehension_rate', rate, 0.7, 'user_reported', trimmed))
    }
  } else if (testerCount && negativeCount !== null && positiveCount === null) {
    const inferredPositive = Math.max(0, testerCount - negativeCount)
    if (inferredPositive > 0) {
      const rate = Math.round((inferredPositive / testerCount) * 100)
      claims.push(claim('validation.comprehension_rate', rate, 0.62, 'user_reported', trimmed))
      claims.push(claim('validation.comprehension_positive', inferredPositive, 0.6, 'user_reported', trimmed))
    }
  }

  if (hasValidationOccurred(trimmed) && claims.every(c => c.predicate !== 'validation.users_tested')) {
    claims.push(claim('validation.has_occurred', true, 0.6, 'user_reported', trimmed))
  }

  const bare = trimmed.toLowerCase()
  if (bare === 'yes' || bare === 'yeah' || bare === 'yep') {
    return [claim('validation.users_tested', true, 0.35, 'user_reported', trimmed)]
  }
  if (bare === 'no' || bare === 'nope') {
    return [claim('validation.users_tested', false, 0.55, 'user_reported', trimmed)]
  }
  if (/nobody|no one|no users|hasn't tested|haven't tested|not tested|was wrong/i.test(trimmed.toLowerCase())) {
    return [claim('validation.users_tested', false, 0.72, 'user_reported', trimmed)]
  }

  return claims
}

export function messageDetailScore(text: string): number {
  const trimmed = text.trim()
  let score = 0
  if (trimmed.length > 40) score += 10
  if (trimmed.length > 100) score += 10
  if (parseTesterCount(trimmed)) score += 15
  if (parseTestedSurface(trimmed)) score += 10
  if (parsePositiveCount(trimmed, parseTesterCount(trimmed))) score += 10
  if (parseNegativeCount(trimmed, parseTesterCount(trimmed))) score += 10
  if (/\d/.test(trimmed)) score += 5
  return Math.min(50, score)
}
