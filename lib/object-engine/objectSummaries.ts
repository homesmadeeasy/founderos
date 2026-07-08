import type { FounderObject } from './objectTypes'
import { OBJECT_TYPE_LABEL, RELATIONSHIP_TYPE_LABEL } from './objectTypes'
import { getObjectsSupporting, getRelationshipsForObject } from './objectRelationships'

export function generateObjectSummary(
  object: FounderObject,
  relatedObjects: FounderObject[],
  allObjects: FounderObject[],
): string {
  const typeLabel = OBJECT_TYPE_LABEL[object.type].toLowerCase()
  const status = object.status ?? 'active'
  const area = object.area ? ` in the ${object.area} area` : ''
  const focus = object.summary || object.content || 'No description yet.'

  const parts: string[] = [
    `${object.title} is an ${status} ${typeLabel}${area}. ${focus}`,
  ]

  const supporters = getObjectsSupporting(object, allObjects)
  if (supporters.length > 0) {
    const names = supporters.slice(0, 4).map(o => `${OBJECT_TYPE_LABEL[o.type].toLowerCase()} "${o.title}"`)
    parts.push(`It is supported by ${names.join(', ')}.`)
  }

  const rels = getRelationshipsForObject(object, allObjects).slice(0, 3)
  if (rels.length > 0 && supporters.length === 0) {
    const relDesc = rels.map(r => {
      const otherId = r.fromObjectId === object.id ? r.toObjectId : r.fromObjectId
      const other = allObjects.find(o => o.id === otherId)
      const verb = RELATIONSHIP_TYPE_LABEL[r.type].toLowerCase()
      return other ? `${verb} "${other.title}"` : verb
    })
    parts.push(`Relationships: ${relDesc.join('; ')}.`)
  }

  if (relatedObjects.length > 0 && supporters.length === 0) {
    parts.push(`Related: ${relatedObjects.slice(0, 3).map(o => o.title).join(', ')}.`)
  }

  return parts.join(' ')
}
