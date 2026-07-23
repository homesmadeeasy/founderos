/**
 * Public read API for specialists.
 * Never mutate reality through this module — all writes go via RealityEngine / RealityContext.
 */

import type {
  RealityDatastore,
  RealitySnapshot,
  RealitySpecialistView,
  RealityTimelineDay,
  RealityTimelineItem,
  SpecialistId,
} from './RealityTypes'
import { RealityEngine } from './RealityEngine'
import { createLocalRealityRepository } from './RealityRepository'

let cachedEngine: RealityEngine | null = null

function getDefaultEngine(): RealityEngine {
  if (!cachedEngine) {
    cachedEngine = new RealityEngine(createLocalRealityRepository())
  }
  return cachedEngine
}

/** For tests / provider wiring. */
export function setRealityEngineForTests(engine: RealityEngine | null): void {
  cachedEngine = engine
}

export async function readRealityStore(): Promise<RealityDatastore> {
  return getDefaultEngine().load()
}

export async function getToday(specialistId?: SpecialistId): Promise<RealityTimelineDay | null> {
  const engine = getDefaultEngine()
  const store = await engine.load()
  return engine.getToday(store, specialistId)
}

export async function getTimeline(options?: {
  specialistId?: SpecialistId
  domain?: RealityDatastore['events'][number]['domain']
  limit?: number
}): Promise<RealityTimelineDay[]> {
  const engine = getDefaultEngine()
  const store = await engine.load()
  return engine.getTimeline(store, options)
}

export async function getSnapshot(specialistId?: SpecialistId): Promise<RealitySnapshot> {
  const engine = getDefaultEngine()
  const store = await engine.load()
  return engine.getSnapshot(store, specialistId)
}

export async function getRecentEvents(
  limit = 25,
  specialistId?: SpecialistId,
): Promise<RealityTimelineItem[]> {
  const engine = getDefaultEngine()
  const store = await engine.load()
  return engine.getRecentEvents(store, limit, specialistId)
}

export async function getCurrentFocus(specialistId?: SpecialistId) {
  const engine = getDefaultEngine()
  const store = await engine.load()
  return engine.getCurrentFocus(store, specialistId)
}

export async function getMomentum(specialistId?: SpecialistId) {
  const engine = getDefaultEngine()
  const store = await engine.load()
  return engine.getMomentum(store, specialistId)
}

export async function readRealityForSpecialist(
  specialistId: SpecialistId,
): Promise<RealitySpecialistView> {
  const engine = getDefaultEngine()
  const store = await engine.load()
  return engine.getSpecialistView(store, specialistId)
}

/** Compact string block suitable for conversation / LLM context. */
export async function buildRealityPromptBlock(
  specialistId?: SpecialistId,
): Promise<string> {
  const snapshot = await getSnapshot(specialistId)
  if (!snapshot.narrativeHints.length) {
    return 'Reality: no live events yet today.'
  }
  const assumptions = snapshot.momentum.confidence < 0.6
    ? '\n(Note: some snapshot fields are estimates, not hard facts.)'
    : ''
  return `Reality snapshot:\n${snapshot.narrativeHints.join('\n')}${assumptions}`
}

export function buildRealityPromptBlockSync(
  store: RealityDatastore,
  specialistId?: SpecialistId,
  engine: RealityEngine = getDefaultEngine(),
): string {
  const snapshot = engine.getSnapshot(store, specialistId)
  if (!snapshot.narrativeHints.length) return 'Reality: no live events yet today.'
  return `Reality snapshot:\n${snapshot.narrativeHints.join('\n')}`
}
