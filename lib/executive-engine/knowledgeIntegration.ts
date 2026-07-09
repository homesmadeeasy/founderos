import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'
import { SEED_KNOWLEDGE_IDS } from '@/lib/knowledge-engine/knowledgeSeedData'
import type { ExecutiveContext } from './executiveTypes'
import { isSchoolObject } from './executiveUtils'

export function findKnowledgeById(
  knowledge: KnowledgeRecord[],
  id: string,
): KnowledgeRecord | undefined {
  return knowledge.find(k => k.id === id)
}

export function findRelevantKnowledge(
  context: ExecutiveContext,
): KnowledgeRecord[] {
  const { knowledge, healthSignals } = context
  const relevant: KnowledgeRecord[] = []
  const seen = new Set<string>()

  function add(record: KnowledgeRecord | undefined) {
    if (record && !seen.has(record.id)) {
      seen.add(record.id)
      relevant.push(record)
    }
  }

  add(findKnowledgeById(knowledge, SEED_KNOWLEDGE_IDS.dailyFocus))
  add(findKnowledgeById(knowledge, SEED_KNOWLEDGE_IDS.objectFirst))

  if (healthSignals && healthSignals.score < 60) {
    add(findKnowledgeById(knowledge, SEED_KNOWLEDGE_IDS.healthProtects))
  }

  const hasSchoolPressure = context.openTasks.some(isSchoolObject)
    || context.blockers.some(b => b.title.toLowerCase().includes('year 12')
      || b.title.toLowerCase().includes('school'))
  if (hasSchoolPressure) {
    add(findKnowledgeById(knowledge, SEED_KNOWLEDGE_IDS.examTraining))
  }

  if (context.activeProjects.length > 3) {
    add(findKnowledgeById(knowledge, SEED_KNOWLEDGE_IDS.buildSoftware))
  }

  for (const mem of context.recentMemories.slice(0, 5)) {
    for (const kid of mem.relatedObjectIds) {
      knowledge
        .filter(k => k.relatedObjectIds.includes(kid))
        .forEach(k => add(k))
    }
  }

  return relevant.slice(0, 5)
}

export function formatKnowledgeForRationale(records: KnowledgeRecord[]): string {
  if (records.length === 0) return ''
  return ` Principles: ${records.map(k => `"${k.title}"`).join(', ')}.`
}

export function formatKnowledgeForBriefing(records: KnowledgeRecord[]): string[] {
  return records.map(k => `${k.title}: ${k.principle}`)
}
