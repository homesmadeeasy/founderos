/**
 * Prompt constant registry (server + client safe re-exports).
 *
 * Domain-specific system prompts live in their feature modules:
 * - lib/ai.ts — project chat
 * - lib/review.ts — project review
 * - lib/weekly-review.ts — weekly review
 * - lib/pattern-analysis.ts — cross-project patterns
 * - lib/project-dna.ts — project DNA
 * - lib/idea.ts — idea analysis
 * - lib/extract.ts — structured extraction schemas
 */

export { SYSTEM_PROMPT } from '@/lib/ai'
export { REVIEW_SYSTEM_PROMPT } from '@/lib/review'
export { WEEKLY_REVIEW_SYSTEM_PROMPT } from '@/lib/weekly-review'
export { PATTERN_ANALYSIS_SYSTEM_PROMPT } from '@/lib/pattern-analysis'
export { PROJECT_DNA_SYSTEM_PROMPT } from '@/lib/project-dna'
export { IDEA_SYSTEM_PROMPT } from '@/lib/idea'
