import type { FounderObject, ObjectRelationship } from '@/lib/object-engine/objectTypes'
import { OBJECT_TYPE_LABEL } from '@/lib/object-engine/objectTypes'
import type { CreateMemoryInput } from './memoryTypes'
import { nowISO } from './memoryUtils'

export type ObjectMemoryAction = 'created' | 'updated' | 'deleted' | 'relationship_created'

export function memoryForObjectAction(
  action: ObjectMemoryAction,
  object: FounderObject,
  extra?: { relationship?: ObjectRelationship; previousTitle?: string },
): CreateMemoryInput {
  const typeLabel = OBJECT_TYPE_LABEL[object.type]
  const dedupeTag = `dedupe:object-${action}-${object.id}`

  if (action === 'created') {
    return {
      type: 'object_change',
      title: `${typeLabel} created: ${object.title}`,
      content: object.summary || object.content || `${typeLabel} "${object.title}" was added to the Object Engine.`,
      importance: object.priority === 'high' ? 'high' : 'medium',
      area: object.area,
      source: 'object_engine',
      relatedObjectIds: [object.id],
      tags: ['object', object.type, dedupeTag],
      occurredAt: nowISO(),
    }
  }

  if (action === 'deleted') {
    return {
      type: 'object_change',
      title: `${typeLabel} deleted: ${object.title}`,
      content: `${typeLabel} "${object.title}" was removed from the Object Engine.`,
      importance: 'medium',
      area: object.area,
      source: 'object_engine',
      relatedObjectIds: [],
      tags: ['object', 'deleted', dedupeTag],
      occurredAt: nowISO(),
    }
  }

  if (action === 'relationship_created' && extra?.relationship) {
    const rel = extra.relationship
    return {
      type: 'insight',
      title: `Relationship linked: ${object.title}`,
      content: `Linked ${rel.type.replace(/_/g, ' ')} relationship from "${object.title}".`,
      importance: 'low',
      area: object.area,
      source: 'object_engine',
      relatedObjectIds: [object.id, rel.toObjectId],
      tags: ['relationship', dedupeTag],
      occurredAt: nowISO(),
    }
  }

  const prev = extra?.previousTitle && extra.previousTitle !== object.title
    ? ` (was "${extra.previousTitle}")`
    : ''
  return {
    type: 'object_change',
    title: `${typeLabel} updated: ${object.title}${prev}`,
    content: object.summary || object.content || `${typeLabel} "${object.title}" was updated.`,
    importance: 'low',
    area: object.area,
    source: 'object_engine',
    relatedObjectIds: [object.id],
    tags: ['object', 'updated', dedupeTag],
    occurredAt: nowISO(),
  }
}
