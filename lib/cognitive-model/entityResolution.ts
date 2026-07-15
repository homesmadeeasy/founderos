import type { BeliefTopic } from './beliefTypes'
import type { RealityEntity } from './realityTypes'

export const DEFAULT_ENTITIES: RealityEntity[] = [
  { id: 'founderos', label: 'FounderOS', domain: 'product', aliases: ['founderos', 'founder os', 'the product'] },
  { id: 'home_page', label: 'Home page', domain: 'product', aliases: ['home', 'home page', 'homepage'] },
  { id: 'founder_surface', label: 'Founder conversation', domain: 'product', aliases: ['founder', '/founder'] },
  { id: 'validation', label: 'User validation', domain: 'validation', aliases: ['validation', 'user testing', 'testers'] },
]

export function resolveEntityFromText(text: string): RealityEntity | null {
  const lower = text.toLowerCase()
  for (const entity of DEFAULT_ENTITIES) {
    if (entity.aliases.some(a => lower.includes(a))) return entity
  }
  return null
}

export function resolveEntityById(id: string | undefined): RealityEntity | null {
  if (!id) return null
  return DEFAULT_ENTITIES.find(e => e.id === id) ?? null
}

export function domainForPredicate(predicate: string): BeliefTopic {
  if (predicate.startsWith('validation.')) return 'validation'
  if (predicate.startsWith('product.')) return 'product'
  if (predicate.startsWith('founder.')) return 'founder'
  return 'general'
}

export function surfaceLabel(surfaceId: string): string {
  const entity = resolveEntityById(surfaceId)
  return entity?.label ?? surfaceId.replace(/_/g, ' ')
}
