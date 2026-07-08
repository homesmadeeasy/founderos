import type { FounderObjectType } from './objectTypes'

/** Lightweight schema hints per object type — for UI defaults and future validation. */
export const OBJECT_SCHEMA_DEFAULTS: Record<FounderObjectType, { status?: string; tags?: string[] }> = {
  project: { status: 'active', tags: [] },
  task: { status: 'active', tags: [] },
  goal: { status: 'active', tags: [] },
  habit: { status: 'active', tags: ['habit'] },
  idea: { status: 'inbox', tags: [] },
  note: { status: 'active', tags: [] },
  decision: { status: 'active', tags: [] },
  workout: { status: 'active', tags: ['health'] },
  meal: { status: 'active', tags: ['health'] },
  book: { status: 'active', tags: ['knowledge'] },
  document: { status: 'active', tags: [] },
  person: { status: 'active', tags: [] },
  event: { status: 'active', tags: [] },
  review: { status: 'completed', tags: [] },
  conversation: { status: 'active', tags: [] },
  capture: { status: 'inbox', tags: [] },
}

export const OBJECT_TYPE_AREAS: Partial<Record<FounderObjectType, string>> = {
  workout: 'health',
  meal: 'health',
  habit: 'health',
  book: 'knowledge',
  goal: 'growth',
  project: 'systems',
}
