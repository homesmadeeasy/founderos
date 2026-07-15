import { z } from 'zod'
import type { RealityClaim } from './realityTypes'
import { extractClaimsFromText } from './claimExtraction'
import { newCognitiveId, nowISO } from './cognitiveUtils'

const realitySourceClass = z.enum([
  'inferred', 'user_reported', 'externally_verified', 'system_observed',
  'contradicted', 'superseded', 'uncertain', 'stale',
])

export const llmClaimSchema = z.object({
  predicate: z.string().min(1).max(80),
  entityId: z.string().max(40).optional(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  confidence: z.number().min(0).max(1).optional(),
  source: realitySourceClass.optional(),
})

export const llmClaimsResponseSchema = z.object({
  claims: z.array(llmClaimSchema).max(12),
})

export function validateAndNormalizeLlmClaims(
  raw: unknown,
  fallbackText: string,
): RealityClaim[] {
  const parsed = llmClaimsResponseSchema.safeParse(raw)
  if (!parsed.success) return extractClaimsFromText(fallbackText)

  const claims: RealityClaim[] = []
  for (const item of parsed.data.claims) {
    claims.push({
      id: newCognitiveId('claim'),
      predicate: item.predicate,
      entityId: item.entityId,
      value: item.value,
      confidence: item.confidence ?? 0.6,
      source: item.source ?? 'user_reported',
      rawText: fallbackText.slice(0, 200),
      recordedAt: nowISO(),
    })
  }
  return claims.length ? claims : extractClaimsFromText(fallbackText)
}
