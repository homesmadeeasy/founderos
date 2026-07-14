import type { Belief, NormalizedCognitiveInput, Unknown, WorldModel } from './beliefTypes'
import { normalizeWorldModel } from './cognitiveNormalize'
import { createEvidence, dedupeEvidence, gatherEvidenceFromInput } from './beliefEvidence'
import { generateHypotheses } from './beliefHypotheses'
import { buildOpenQuestions } from './beliefQuestions'
import { mergeContradictions, detectContradictions } from './beliefContradictions'
import { createBelief, recomputeBelief, upsertBeliefsByStatement } from './beliefUpdates'
import { asString, newCognitiveId, normalizeStatement, nowISO } from './cognitiveUtils'
import { mergeEvidenceLists } from './cognitiveCompaction'

function dim(label: string, score: number, summary: string, confidence = 50): WorldModel['momentum'] {
  return { label, score, confidence, summary }
}

export function createEmptyWorldModel(): WorldModel {
  const now = nowISO()
  return {
    vision: '',
    mission: '',
    values: [],
    currentStage: 'unknown',
    momentum: dim('Momentum', 50, 'Not yet assessed'),
    execution: dim('Execution', 50, 'Not yet assessed'),
    validation: dim('Validation', 50, 'Not yet assessed'),
    health: dim('Health', 50, 'Not yet assessed'),
    learning: dim('Learning', 50, 'Not yet assessed'),
    relationships: dim('Relationships', 50, 'Not yet assessed'),
    finance: dim('Finance', 50, 'Not yet assessed'),
    unknowns: [],
    openQuestions: [],
    currentRisks: [],
    currentHypotheses: [],
    currentBottlenecks: [],
    confidenceLevels: {},
    beliefs: [],
    contradictions: [],
    updatedAt: now,
  }
}

const SEED_UNKNOWN_STATEMENTS = [
  { statement: 'Whether real users have tested the product recently', topic: 'validation' as const, importance: 'high' as const },
  { statement: 'Whether the value proposition is clear in under sixty seconds', topic: 'product' as const, importance: 'high' as const },
  { statement: 'What the founder considers the current stage of the company', topic: 'founder' as const, importance: 'medium' as const },
]

export function reconcileWorldModel(prev: WorldModel, input: NormalizedCognitiveInput): WorldModel {
  const base = normalizeWorldModel(prev)
  const snap = input.founderSnapshot
  const evidence = dedupeEvidence(gatherEvidenceFromInput(input))
  let beliefs = [...base.beliefs]

  if (input.mission) {
    const missionStatement = input.mission
    const hasMission = beliefs.some(
      (b) => normalizeStatement(b.statement) === normalizeStatement(missionStatement),
    )
    if (!hasMission) {
      beliefs = [...beliefs, createBelief(missionStatement, 'mission', 'user_statement', 70, 'high')]
    }
  }

  if (snap) {
    const bottleneck = asString(snap.mainBottleneck, 'None')
    const snapBeliefs: { statement: string; topic: Belief['topic']; confidence: number; importance: Belief['importance'] }[] = [
      {
        statement: `Current stage is ${asString(snap.currentStage, 'unknown')}`,
        topic: 'founder',
        confidence: 55,
        importance: 'high',
      },
      {
        statement: `Main bottleneck: ${bottleneck}`,
        topic: 'strategy',
        confidence: 60,
        importance: 'high',
      },
      {
        statement: asString(snap.mainInsight, 'Still forming insight'),
        topic: 'strategy',
        confidence: 50,
        importance: 'medium',
      },
    ]
    for (const seed of snapBeliefs) {
      const exists = beliefs.some((b) => normalizeStatement(b.statement) === normalizeStatement(seed.statement))
      if (exists) continue
      beliefs = [...beliefs, createBelief(seed.statement, seed.topic, 'system_inference', seed.confidence, seed.importance)]
    }

    if (bottleneck !== 'None') {
      const needle = bottleneck.toLowerCase().slice(0, 8)
      for (const e of evidence) {
        const related = beliefs.filter((b) => b.statement.toLowerCase().includes(needle))
        for (const b of related) {
          const idx = beliefs.findIndex((x) => x.id === b.id)
          if (idx < 0) continue
          const supporting = mergeEvidenceLists(b.supportingEvidence, e.supports ? [e] : [], b.id)
          const contradicting = mergeEvidenceLists(b.contradictingEvidence, !e.supports ? [e] : [], b.id)
          if (
            supporting.length === b.supportingEvidence.length
            && contradicting.length === b.contradictingEvidence.length
          ) continue
          beliefs[idx] = recomputeBelief({
            ...b,
            supportingEvidence: supporting,
            contradictingEvidence: contradicting,
          })
        }
      }
    }
  }

  for (const cb of input.conversationBeliefs) {
    const stmt = `${cb.label}: ${cb.displayValue}`
    const existing = beliefs.find((b) => b.statement.toLowerCase() === stmt.toLowerCase())
    if (existing) continue
    beliefs = upsertBeliefsByStatement(beliefs, [
      createBelief(stmt, 'founder', 'conversation', cb.confidence, 'medium'),
    ])
  }

  let unknowns = [...base.unknowns]
  if (unknowns.length === 0) {
    unknowns = SEED_UNKNOWN_STATEMENTS.map((s) => ({
      id: newCognitiveId('unk'),
      statement: s.statement,
      topic: s.topic,
      importance: s.importance,
      relatedBeliefIds: [],
      createdAt: nowISO(),
    }))
  }

  for (const b of beliefs.filter((x) => x.confidence >= 75 && x.status !== 'unknown')) {
    unknowns = unknowns.filter((u) => !u.statement.toLowerCase().includes(b.topic))
  }

  const hypotheses = generateHypotheses(input, base.currentHypotheses)
  const contradictions = mergeContradictions(base.contradictions, detectContradictions(beliefs))

  const world: WorldModel = {
    vision: base.vision,
    mission: input.mission || base.mission,
    values: base.values,
    currentStage: snap?.currentStage ?? base.currentStage,
    momentum: dim('Momentum', snap?.momentumScore ?? base.momentum.score, snap?.mainInsight ?? base.momentum.summary, 55),
    execution: dim('Execution', snap?.executionScore ?? base.execution.score, 'Execution pace and focus', 50),
    validation: dim('Validation', snap?.validationScore ?? base.validation.score, 'Evidence from real users', 45),
    health: dim('Health', base.health.score, base.health.summary),
    learning: dim('Learning', base.learning.score, base.learning.summary),
    relationships: dim('Relationships', base.relationships.score, base.relationships.summary),
    finance: dim('Finance', base.finance.score, base.finance.summary),
    unknowns,
    openQuestions: [],
    currentRisks: snap?.risks.map((r) => r.title).filter(Boolean) ?? base.currentRisks,
    currentHypotheses: hypotheses,
    currentBottlenecks: snap?.mainBottleneck && snap.mainBottleneck !== 'None'
      ? [snap.mainBottleneck]
      : base.currentBottlenecks,
    confidenceLevels: {
      overall: beliefs.length
        ? Math.round(beliefs.reduce((s, b) => s + b.confidence, 0) / beliefs.length)
        : 40,
      validation: snap?.validationScore ?? base.confidenceLevels.validation ?? 40,
      execution: snap?.executionScore ?? base.confidenceLevels.execution ?? 50,
    },
    beliefs,
    contradictions,
    updatedAt: nowISO(),
  }

  world.openQuestions = buildOpenQuestions(world)

  const prevSnapshot = JSON.stringify({
    ...base,
    updatedAt: '',
    openQuestions: base.openQuestions,
  })
  const nextSnapshot = JSON.stringify({
    ...world,
    updatedAt: '',
    openQuestions: world.openQuestions,
  })
  if (prevSnapshot === nextSnapshot) {
    return prev
  }

  return world
}

export function topBelief(world: WorldModel): Belief | null {
  const beliefs = normalizeWorldModel(world).beliefs
  const sorted = [...beliefs].sort((a, b) => b.importance.localeCompare(a.importance) || b.confidence - a.confidence)
  return sorted[0] ?? null
}

export function biggestUnknown(world: WorldModel): Unknown | null {
  const unknowns = normalizeWorldModel(world).unknowns
  const order = { critical: 4, high: 3, medium: 2, low: 1 }
  return [...unknowns].sort((a, b) => order[b.importance] - order[a.importance])[0] ?? null
}

export function highestRisk(world: WorldModel): string {
  const model = normalizeWorldModel(world)
  return model.currentRisks[0] ?? model.currentBottlenecks[0] ?? 'No major risks identified yet'
}
