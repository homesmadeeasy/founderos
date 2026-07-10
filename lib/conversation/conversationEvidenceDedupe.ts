import type { ConversationEvidence } from './conversationTypes'

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/architecture score (\d+)/g, 'architecture score')
    .replace(/validation score (\d+)/g, 'validation score')
    .trim()
}

export function dedupeConversationEvidence(
  evidence: ConversationEvidence[],
  max = 12,
): ConversationEvidence[] {
  const seen = new Set<string>()
  const result: ConversationEvidence[] = []

  const sorted = [...evidence]
    .filter(e => !e.superseded && e.evidenceKind !== 'historical')
    .sort((a, b) => b.weight - a.weight)

  for (const item of sorted) {
    const key = `${item.sourceType}:${item.evidenceKind ?? 'default'}:${item.sourceId ?? ''}:${normalizeLabel(item.title)}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
    if (result.length >= max) break
  }

  return result
}

export function evidenceKey(item: ConversationEvidence): string {
  return `${item.sourceType}:${item.sourceId ?? item.id}:${normalizeLabel(item.title)}`
}
