/** Server-safe Founder AI configuration — single source for model name and limits. */

export const FOUNDER_AI_DEFAULT_MODEL = 'gpt-4o-mini'

/**
 * Model name for Founder AI. Reads optional OPENAI_FOUNDER_MODEL without importing
 * server env helpers (this module is also imported by client settings for the default label).
 */
export function getFounderAIModel(): string {
  const fromEnv = process.env.OPENAI_FOUNDER_MODEL?.trim()
  return fromEnv || FOUNDER_AI_DEFAULT_MODEL
}

export const FOUNDER_AI_TIMEOUT_MS = 25_000

export const FOUNDER_AI_LIMITS = {
  MAX_RECENT_TURNS: 8,
  MAX_EVIDENCE: 14,
  MAX_MEMORIES: 6,
  MAX_KNOWLEDGE: 4,
  MAX_SIGNALS: 4,
  MAX_OUTCOMES: 4,
  MAX_BELIEFS: 12,
  MAX_UNKNOWNS: 6,
  MAX_CONTRADICTIONS: 4,
  MAX_HYPOTHESES: 4,
  MAX_ACTIONS: 4,
  MAX_BELIEF_UPDATES: 5,
  MAX_MEMORY_DRAFTS: 3,
  MAX_KNOWLEDGE_DRAFTS: 3,
  MAX_MESSAGE_CHARS: 2_000,
  MAX_SUMMARY_CHARS: 400,
  MAX_STATEMENT_CHARS: 200,
  MAX_REQUEST_BODY_BYTES: 48_000,
  MAX_PROPOSALS_STORED: 40,
  MAX_PROPOSAL_HISTORY: 80,
} as const

/** Development-only in-memory rate limit (requests per user per minute). */
export const FOUNDER_AI_DEV_RATE_LIMIT = 24
