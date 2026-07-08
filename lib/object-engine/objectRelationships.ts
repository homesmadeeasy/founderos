import type { FounderObject, ObjectRelationship, RelationshipType } from './objectTypes'
import { RELATIONSHIP_TYPE_LABEL } from './objectTypes'

export function getRelationshipsForObject(
  object: FounderObject,
  allObjects: FounderObject[],
): ObjectRelationship[] {
  const outgoing = object.relationships
  const incoming = allObjects.flatMap(o =>
    o.relationships.filter(r => r.toObjectId === object.id),
  )
  const seen = new Set<string>()
  return [...outgoing, ...incoming].filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })
}

export function getRelatedObjects(
  object: FounderObject,
  allObjects: FounderObject[],
  type?: RelationshipType,
): FounderObject[] {
  const rels = getRelationshipsForObject(object, allObjects)
  const filtered = type ? rels.filter(r => r.type === type) : rels
  const ids = new Set<string>()
  for (const r of filtered) {
    if (r.fromObjectId === object.id) ids.add(r.toObjectId)
    if (r.toObjectId === object.id) ids.add(r.fromObjectId)
  }
  return allObjects.filter(o => ids.has(o.id) && o.id !== object.id)
}

export function getObjectsSupporting(
  target: FounderObject,
  allObjects: FounderObject[],
): FounderObject[] {
  return getRelatedObjects(target, allObjects, 'supports')
}

export function describeRelationship(
  rel: ObjectRelationship,
  from: FounderObject | undefined,
  to: FounderObject | undefined,
): string {
  const label = RELATIONSHIP_TYPE_LABEL[rel.type]
  const fromTitle = from?.title ?? 'Unknown'
  const toTitle = to?.title ?? 'Unknown'
  return `${fromTitle} ${label.toLowerCase()} ${toTitle}`
}

export function findObjectByTitle(
  allObjects: FounderObject[],
  query: string,
): FounderObject | undefined {
  const q = query.trim().toLowerCase()
  return allObjects.find(o => o.title.toLowerCase().includes(q))
}
