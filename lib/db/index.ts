/**
 * FounderOS Supabase data-access layer.
 *
 * Organised by domain under lib/db/*.ts — import from `@/lib/db` as before.
 */

export type {
  NewProject, NewTask, NewNote, NewDecision, NewRisk, NewRoadmapItem,
  NewIdea, NewLink, NewProjectFile,
} from './input-types'

export type { DemoWorkspaceResult } from './onboarding'

export * from './app-state'
export * from './context'
export * from './decisions'
export * from './dna'
export * from './files'
export * from './ideas'
export * from './memory'
export * from './messages'
export * from './notes'
export * from './onboarding'
export * from './patterns'
export * from './projects'
export * from './reviews'
export * from './risks'
export * from './roadmap'
export * from './tasks'
export * from './weekly-reviews'
