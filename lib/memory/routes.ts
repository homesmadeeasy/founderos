/**
 * Client-safe helpers for semantic memory UI and navigation.
 */

import type { MemoryEntityType } from '@/lib/types'

export const MEMORY_ENTITY_LABEL: Record<MemoryEntityType, string> = {
  idea: 'Idea',
  idea_analysis: 'Idea analysis',
  project: 'Project',
  message: 'Chat message',
  task: 'Task',
  note: 'Note',
  decision: 'Decision',
  risk: 'Risk',
  roadmap_item: 'Roadmap item',
  project_review: 'Project review',
  weekly_review: 'Weekly review',
  project_file: 'Project file',
  project_dna: 'Project DNA',
  pattern_analysis: 'Pattern analysis',
  link: 'Memory link',
}

export const MEMORY_ENTITY_TYPES: MemoryEntityType[] = [
  'idea', 'idea_analysis', 'project', 'message', 'task', 'note', 'decision',
  'risk', 'roadmap_item', 'project_review', 'weekly_review', 'project_file',
  'project_dna', 'pattern_analysis', 'link',
]

/** Build a user-facing route for a memory search result. */
export function memoryEntityHref(
  entityType: MemoryEntityType,
  entityId: string,
  projectId: string | null,
  metadata?: Record<string, unknown>,
): string {
  switch (entityType) {
    case 'project':
      return `/projects/${entityId}`
    case 'idea':
    case 'idea_analysis':
      return metadata?.ideaId ? `/ideas/${metadata.ideaId}` : `/ideas/${entityId}`
    case 'task':
      return projectId ? `/projects/${projectId}/tasks` : '/projects'
    case 'note':
      return projectId ? `/projects/${projectId}/notes` : '/projects'
    case 'decision':
      return projectId ? `/projects/${projectId}/decisions` : '/projects'
    case 'risk':
      return projectId ? `/projects/${projectId}/risks` : '/projects'
    case 'roadmap_item':
      return projectId ? `/projects/${projectId}/roadmap` : '/projects'
    case 'message':
      return projectId ? `/projects/${projectId}/chat` : '/projects'
    case 'project_review':
      return projectId ? `/projects/${projectId}/review` : '/projects'
    case 'project_file':
      return projectId ? `/projects/${projectId}/files` : '/projects'
    case 'project_dna':
      return projectId ? `/projects/${projectId}/dna` : '/projects'
    case 'weekly_review':
      return '/weekly-review'
    case 'pattern_analysis':
      return '/patterns'
    case 'link':
      return projectId ? `/projects/${projectId}/memory` : '/memory-search'
    default:
      return '/memory-search'
  }
}

/** Fire-and-forget call to index a single entity after create/update. */
export function queueMemoryIndex(entityType: MemoryEntityType, entityId: string): void {
  void fetch('/api/memory/index-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_type: entityType, entity_id: entityId }),
  }).catch(err => console.warn('[FounderOS] memory index queue failed:', err))
}
