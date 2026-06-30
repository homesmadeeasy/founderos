/**
 * Knowledge Graph / Linked Memory helpers.
 *
 * Safe for the client — contains NO secrets.
 *
 * Responsibilities:
 *   - Constant lists of entity + relationship types (for UI dropdowns/filters).
 *   - describeLink(): turn a Link into a readable English sentence.
 *   - getProjectLinks(): filter the user's links down to one project.
 *   - buildLabelResolver()/summarizeLinks(): produce concise summaries for the
 *     AI chat + review context.
 */

import type {
  AppState, Link, EntityType, RelationshipType,
} from './types'

// ─── Constants ──────────────────────────────────────────────────────────────

export const ENTITY_TYPES: EntityType[] = [
  'idea', 'idea_analysis', 'project', 'conversation', 'message',
  'task', 'note', 'decision', 'risk', 'roadmap_item', 'project_review', 'project_file', 'weekly_review', 'project_dna', 'pattern_analysis',
]

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'created_from', 'converted_to', 'suggested_by', 'supports', 'blocks',
  'relates_to', 'caused_by', 'resolves', 'depends_on', 'part_of',
]

/** Display name for each entity type. */
export const ENTITY_LABEL: Record<EntityType, string> = {
  idea:           'Idea',
  idea_analysis:  'Idea analysis',
  project:        'Project',
  conversation:   'Conversation',
  message:        'AI chat message',
  task:           'Task',
  note:           'Note',
  decision:       'Decision',
  risk:           'Risk',
  roadmap_item:   'Roadmap item',
  project_review: 'Project Review',
  project_file:   'Project file',
  weekly_review:  'Weekly Review',
  project_dna:    'Project DNA',
  pattern_analysis: 'Pattern Analysis',
}

/** Human label for a relationship type (for grouping / filters). */
export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  created_from: 'Created from',
  converted_to: 'Converted to',
  suggested_by: 'Suggested by',
  supports:     'Supports',
  blocks:       'Blocks',
  relates_to:   'Relates to',
  caused_by:    'Caused by',
  resolves:     'Resolves',
  depends_on:   'Depends on',
  part_of:      'Part of',
}

/** Entity types that have a user-facing title we can resolve. */
const TITLED_TYPES: EntityType[] = ['idea', 'project', 'task', 'note', 'decision', 'risk', 'roadmap_item', 'project_file']

// ─── Label resolution ─────────────────────────────────────────────────────────

export type LabelResolver = (type: EntityType, id: string) => string | undefined

/** Build a resolver that maps (type, id) → title from the global app state. */
export function buildLabelResolver(state: AppState): LabelResolver {
  return (type, id) => {
    switch (type) {
      case 'project':      return state.projects.find(p => p.id === id)?.title
      case 'task':         return state.tasks.find(t => t.id === id)?.title
      case 'note':         return state.notes.find(n => n.id === id)?.title
      case 'decision':     return state.decisions.find(d => d.id === id)?.decision
      case 'risk':         return state.risks.find(r => r.id === id)?.title
      case 'roadmap_item': return state.roadmapItems.find(r => r.id === id)?.title
      case 'idea':         return state.ideas.find(i => i.id === id)?.title
      case 'project_file': return state.projectFiles.find(f => f.id === id)?.fileName
      default:             return undefined
    }
  }
}

/** Produce a label for one endpoint, e.g. `Task "Build chat UI"` or `Project Review`. */
function labelFor(type: EntityType, title: string | undefined): string {
  const disp = ENTITY_LABEL[type]
  if (title && title.trim()) return `${disp} "${title.trim()}"`
  if (type === 'message') return 'an AI chat message'
  return disp
}

// ─── Natural-language formatting ────────────────────────────────────────────────

/** Turn a link into a readable sentence using a label resolver. */
export function describeLink(link: Link, resolve: LabelResolver): string {
  const source = labelFor(link.sourceType, resolve(link.sourceType, link.sourceId))
  const target = labelFor(link.targetType, resolve(link.targetType, link.targetId))

  switch (link.relationshipType) {
    case 'converted_to': return `${source} was turned into ${target}.`
    case 'created_from':  return `${target} was created from ${source}.`
    case 'suggested_by':  return `${target} was suggested by ${source}.`
    case 'blocks':        return `${source} blocks ${target}.`
    case 'supports':      return `${source} supports ${target}.`
    case 'resolves':      return `${source} resolves ${target}.`
    case 'depends_on':    return `${source} depends on ${target}.`
    case 'part_of':
      if (link.sourceType === 'project' && link.targetType === 'project_file') {
        return `${target} was uploaded to ${source}.`
      }
      if (link.sourceType === 'project' && link.targetType === 'project_dna') {
        return `${target} was generated for ${source}.`
      }
      return `${source} is part of ${target}.`
    case 'caused_by':     return `${source} was caused by ${target}.`
    case 'relates_to':    return `${source} relates to ${target}.`
    default:              return `${source} ${String(link.relationshipType).replace(/_/g, ' ')} ${target}.`
  }
}

// ─── Project scoping ─────────────────────────────────────────────────────────

/**
 * Collect the set of entity ids that belong to a project: the project itself,
 * its tasks/notes/decisions/risks/roadmap items, and its chat message ids.
 * A link is considered part of the project if either endpoint is in this set.
 */
export function collectProjectEntityIds(state: AppState, projectId: string): Set<string> {
  const ids = new Set<string>([projectId])
  state.tasks.forEach(t => { if (t.projectId === projectId) ids.add(t.id) })
  state.notes.forEach(n => { if (n.projectId === projectId) ids.add(n.id) })
  state.decisions.forEach(d => { if (d.projectId === projectId) ids.add(d.id) })
  state.risks.forEach(r => { if (r.projectId === projectId) ids.add(r.id) })
  state.roadmapItems.forEach(r => { if (r.projectId === projectId) ids.add(r.id) })
  state.projectFiles.forEach(f => { if (f.projectId === projectId) ids.add(f.id) })
  ;(state.chatMessages[projectId] ?? []).forEach(m => ids.add(m.id))
  state.links.forEach(l => {
    if (l.sourceType === 'project' && l.sourceId === projectId && l.targetType === 'project_dna') {
      ids.add(l.targetId)
    }
    if (l.targetType === 'project' && l.targetId === projectId && l.sourceType === 'project_dna') {
      ids.add(l.sourceId)
    }
  })
  return ids
}

/** Filter all links down to those relevant to a project, newest first. */
export function getProjectLinks(links: Link[], projectEntityIds: Set<string>): Link[] {
  return links
    .filter(l => projectEntityIds.has(l.sourceId) || projectEntityIds.has(l.targetId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/** Concise English summaries of a project's links, for AI context (capped). */
export function summarizeLinks(links: Link[], resolve: LabelResolver, limit = 15): string[] {
  return links.slice(0, limit).map(l => describeLink(l, resolve))
}
