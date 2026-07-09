import type { KnowledgeDomain, KnowledgeRecord } from './knowledgeTypes'
import { KNOWLEDGE_DOMAIN_LABEL, KNOWLEDGE_TYPE_LABEL } from './knowledgeTypes'

export function generateKnowledgeSummary(record: KnowledgeRecord): string {
  const parts = [
    `${KNOWLEDGE_TYPE_LABEL[record.type]}: ${record.title}`,
    record.principle,
  ]
  if (record.domain) parts.push(`Domain: ${KNOWLEDGE_DOMAIN_LABEL[record.domain]}`)
  if (record.explanation) parts.push(record.explanation)
  return parts.join('\n')
}

export function summarizeKnowledgeByDomain(
  records: KnowledgeRecord[],
  domain: KnowledgeDomain,
  limit = 5,
): string {
  const filtered = records.filter(r => r.domain === domain).slice(0, limit)
  if (filtered.length === 0) return `No knowledge in ${KNOWLEDGE_DOMAIN_LABEL[domain]} domain yet.`
  return filtered.map(r => `• **${r.title}** — ${r.principle}`).join('\n')
}

export function summarizeTopPrinciples(records: KnowledgeRecord[], limit = 5): string {
  const principles = records
    .filter(r => r.type === 'principle' || r.type === 'rule')
    .slice(0, limit)
  if (principles.length === 0) return 'No principles recorded yet.'
  return principles.map(r => `• ${r.title}: ${r.principle}`).join('\n')
}

export function explainMemoryVsKnowledge(): string {
  return [
    '**Memory** records what happened — events, decisions, reflections, health logs.',
    '**Knowledge** captures what should guide future action — principles, rules, playbooks.',
    '',
    'Example: completing a workout creates a memory. The principle "Health protects output" is knowledge.',
    '',
    'Use Memory Engine for history. Use Knowledge Engine for durable guidance.',
  ].join('\n')
}
