/**
 * Public read API for specialists.
 * Never mutate identity through this module — all writes go via IdentityEngine / IdentityContext.
 */

import type { IdentityDatastore, IdentitySpecialistView, SpecialistId } from './identityTypes'
import { IdentityEngine } from './IdentityEngine'
import { createLocalIdentityRepository } from './IdentityRepository'

let cachedEngine: IdentityEngine | null = null

function getDefaultEngine(): IdentityEngine {
  if (!cachedEngine) {
    cachedEngine = new IdentityEngine(createLocalIdentityRepository())
  }
  return cachedEngine
}

/** For tests / provider wiring. */
export function setIdentityEngineForTests(engine: IdentityEngine | null): void {
  cachedEngine = engine
}

export async function readIdentityStore(): Promise<IdentityDatastore> {
  return getDefaultEngine().load()
}

export async function readIdentityForSpecialist(
  specialistId: SpecialistId,
): Promise<IdentitySpecialistView> {
  const engine = getDefaultEngine()
  const store = await engine.load()
  return engine.getSpecialistView(store, specialistId)
}

/** Compact string block suitable for conversation / LLM context. */
export async function buildIdentityPromptBlock(
  specialistId: SpecialistId,
): Promise<string> {
  const view = await readIdentityForSpecialist(specialistId)
  if (view.narrativeHints.length === 0) {
    return 'Identity: no durable facts yet.'
  }
  const contradictions = view.contradictions.length
    ? `\nContradictions to respect (keep both declared and observed):\n${
      view.contradictions.map(c => `- ${c.contradictionNote ?? c.label}`).join('\n')
    }`
    : ''
  return `Identity context for ${specialistId}:\n${view.narrativeHints.join('\n')}${contradictions}`
}

export function buildIdentityPromptBlockSync(
  store: IdentityDatastore,
  specialistId: SpecialistId,
  engine: IdentityEngine = getDefaultEngine(),
): string {
  const view = engine.getSpecialistView(store, specialistId)
  if (view.narrativeHints.length === 0) return 'Identity: no durable facts yet.'
  return `Identity context for ${specialistId}:\n${view.narrativeHints.join('\n')}`
}
