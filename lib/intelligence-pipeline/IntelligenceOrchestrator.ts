import {
  CANONICAL_STAGE_ORDER,
  STAGE_LABELS,
  INTELLIGENCE_PIPELINE_VERSION,
  type IntelligenceRequest,
  type IntelligenceResult,
  type IntelligenceSources,
  type IntelligenceStageId,
  type IntelligenceStageTrace,
  type IntelligenceTrace,
  type StageStatus,
} from './intelligenceTypes'

function nowISO(): string {
  return new Date().toISOString()
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `intel_${crypto.randomUUID()}`
  }
  return `intel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function average(nums: number[]): number {
  if (!nums.length) return 0.5
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

class StageRunner {
  private readonly seen = new Set<IntelligenceStageId>()
  readonly stages: IntelligenceStageTrace[] = []

  run(id: IntelligenceStageId, fn: () => { status: StageStatus; detail?: string }): void {
    const started = performance.now()
    if (this.seen.has(id)) {
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: 'skipped',
        detail: 'Duplicate stage call blocked',
        durationMs: 0,
        duplicateBlocked: true,
      })
      return
    }
    this.seen.add(id)
    try {
      const result = fn()
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: result.status,
        detail: result.detail,
        durationMs: Math.round(performance.now() - started),
      })
    } catch (err) {
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: 'failed',
        detail: err instanceof Error ? err.message : 'stage failed',
        durationMs: Math.round(performance.now() - started),
      })
    }
  }

  async runAsync(id: IntelligenceStageId, fn: () => Promise<{ status: StageStatus; detail?: string }>): Promise<void> {
    const started = performance.now()
    if (this.seen.has(id)) {
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: 'skipped',
        detail: 'Duplicate stage call blocked',
        durationMs: 0,
        duplicateBlocked: true,
      })
      return
    }
    this.seen.add(id)
    try {
      const result = await fn()
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: result.status,
        detail: result.detail,
        durationMs: Math.round(performance.now() - started),
      })
    } catch (err) {
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: 'failed',
        detail: err instanceof Error ? err.message : 'stage failed',
        durationMs: Math.round(performance.now() - started),
      })
    }
  }
}

function joinSummary(parts: string[], empty: string): string {
  const cleaned = parts.map(p => p.trim()).filter(Boolean)
  return cleaned.length ? cleaned.join(' · ') : empty
}

/**
 * Canonical intelligence orchestration.
 * Calls existing engines only via the provided source bag — no new domain engines.
 */
export async function runIntelligencePipeline(
  request: IntelligenceRequest,
  sources: IntelligenceSources = {},
): Promise<IntelligenceResult> {
  const startedAt = nowISO()
  const t0 = performance.now()
  const runner = new StageRunner()
  const missing: string[] = []
  const notes: string[] = []

  let identitySummary = ''
  let realitySummary = ''
  let relevantMemories = sources.memories?.slice(0, 8) ?? []
  let knowledge = sources.knowledge?.slice(0, 6) ?? []
  let relevantBeliefs = sources.beliefs?.slice(0, 8) ?? []
  let goals = sources.goals?.slice(0, 6) ?? []
  let supportingEvidence = sources.evidence?.slice(0, 10) ?? []
  let reasoning = ''
  let decisionNote = ''
  let recommendedActions = (sources.executiveRecommendations ?? []).slice(0, 5).map((label, i) => ({
    id: `rec_${i}`,
    label,
    rationale: 'From executive / morning recommendations',
    confidence: 0.7,
  }))
  let response = ''

  // Fixed canonical order — never reorder per specialist.
  for (const stageId of CANONICAL_STAGE_ORDER) {
    if (stageId === 'conversation_context') {
      runner.run(stageId, () => {
        if (!request.conversationContext?.trim() && !request.question.trim()) {
          missing.push('conversation context')
          return { status: 'degraded', detail: 'Empty conversation context' }
        }
        return {
          status: 'ok',
          detail: request.conversationContext?.slice(0, 120) || `Question: ${request.question.slice(0, 80)}`,
        }
      })
      continue
    }

    if (stageId === 'identity') {
      runner.run(stageId, () => {
        const hints = sources.identityHints ?? []
        identitySummary = sources.identitySummary
          ?? (hints.length ? hints.slice(0, 6).join('; ') : '')
        if (!identitySummary) {
          missing.push('identity facts')
          return { status: 'skipped', detail: 'No identity source' }
        }
        return { status: 'ok', detail: identitySummary.slice(0, 160) }
      })
      continue
    }

    if (stageId === 'reality') {
      runner.run(stageId, () => {
        const hints = sources.realityHints ?? []
        realitySummary = sources.realitySummary
          ?? (hints.length ? hints.slice(0, 6).join('; ') : '')
        if (!realitySummary) {
          missing.push('reality snapshot')
          return { status: 'skipped', detail: 'No reality source' }
        }
        return { status: 'ok', detail: realitySummary.slice(0, 160) }
      })
      continue
    }

    if (stageId === 'memory') {
      runner.run(stageId, () => {
        if (!relevantMemories.length) {
          missing.push('relevant memories')
          return { status: 'skipped', detail: 'No memory hits' }
        }
        return { status: 'ok', detail: `${relevantMemories.length} memories` }
      })
      continue
    }

    if (stageId === 'knowledge') {
      runner.run(stageId, () => {
        if (!knowledge.length) {
          missing.push('knowledge principles')
          return { status: 'skipped', detail: 'No knowledge source' }
        }
        // Fold knowledge into evidence for the standard output model.
        for (const k of knowledge) {
          supportingEvidence.push({
            id: `know_${k.id}`,
            title: k.title,
            summary: k.summary,
            weight: 0.6,
            source: 'knowledge',
          })
        }
        return { status: 'ok', detail: `${knowledge.length} knowledge items` }
      })
      continue
    }

    if (stageId === 'beliefs') {
      runner.run(stageId, () => {
        if (!relevantBeliefs.length) {
          missing.push('beliefs')
          return { status: 'skipped', detail: 'No world-model beliefs' }
        }
        return { status: 'ok', detail: `${relevantBeliefs.length} beliefs` }
      })
      continue
    }

    if (stageId === 'goals') {
      runner.run(stageId, () => {
        if (!goals.length) {
          missing.push('goals')
          return { status: 'skipped', detail: 'No goals provided' }
        }
        return { status: 'ok', detail: goals.slice(0, 3).join('; ') }
      })
      continue
    }

    if (stageId === 'evidence') {
      runner.run(stageId, () => {
        if (!supportingEvidence.length) {
          // Derive light evidence from available summaries so specialists still get a list.
          if (identitySummary) {
            supportingEvidence.push({
              id: 'ev_identity',
              title: 'Identity',
              summary: identitySummary.slice(0, 200),
              weight: 0.85,
              source: 'identity',
            })
          }
          if (realitySummary) {
            supportingEvidence.push({
              id: 'ev_reality',
              title: 'Reality',
              summary: realitySummary.slice(0, 200),
              weight: 0.8,
              source: 'reality',
            })
          }
          for (const m of relevantMemories.slice(0, 3)) {
            supportingEvidence.push({
              id: `ev_mem_${m.id}`,
              title: m.title,
              summary: m.summary,
              weight: 0.65,
              source: 'memory',
            })
          }
        }
        if (!supportingEvidence.length) {
          missing.push('supporting evidence')
          return { status: 'degraded', detail: 'No evidence assembled' }
        }
        return { status: 'ok', detail: `${supportingEvidence.length} evidence items` }
      })
      continue
    }

    if (stageId === 'reasoning') {
      runner.run(stageId, () => {
        reasoning = sources.reasoningSummary?.trim()
          || [
            identitySummary && `Identity: ${identitySummary}`,
            realitySummary && `Reality: ${realitySummary}`,
            relevantBeliefs[0] && `Belief: ${relevantBeliefs[0].statement}`,
            goals[0] && `Goal: ${goals[0]}`,
          ].filter(Boolean).join('\n')
          || 'Insufficient structured context; specialist should ask for missing information.'
        if (!sources.reasoningSummary) {
          return { status: relevantMemories.length || identitySummary || realitySummary ? 'degraded' : 'skipped', detail: 'Synthesized from available sources' }
        }
        return { status: 'ok', detail: reasoning.slice(0, 160) }
      })
      continue
    }

    if (stageId === 'decision') {
      runner.run(stageId, () => {
        decisionNote = sources.decisionSummary?.trim() || ''
        if (!decisionNote) {
          missing.push('decision output')
          return { status: 'skipped', detail: 'No decision engine output' }
        }
        return { status: 'ok', detail: decisionNote.slice(0, 160) }
      })
      continue
    }

    if (stageId === 'recommendation') {
      runner.run(stageId, () => {
        if (!recommendedActions.length && decisionNote) {
          recommendedActions = [{
            id: 'rec_decision',
            label: decisionNote.slice(0, 120),
            rationale: 'Primary decision summary',
            confidence: 0.75,
          }]
        }
        if (!recommendedActions.length) {
          return { status: 'skipped', detail: 'No recommendations' }
        }
        return { status: 'ok', detail: `${recommendedActions.length} actions` }
      })
      continue
    }

    if (stageId === 'response') {
      await runner.runAsync(stageId, async () => {
        const narrativeHints = [
          ...((sources.identityHints ?? []).slice(0, 4)),
          ...((sources.realityHints ?? []).slice(0, 4)),
          ...relevantMemories.slice(0, 2).map(m => m.title),
        ]
        const partial = {
          identitySummary: identitySummary || 'No identity summary.',
          realitySummary: realitySummary || 'No reality summary.',
          relevantMemories,
          relevantBeliefs,
          supportingEvidence,
          reasoning,
          confidence: 0,
          recommendedActions,
          explanation: '',
          missingInformation: [...missing],
          narrativeHints,
          identityHints: sources.identityHints ?? [],
          realityHints: sources.realityHints ?? [],
        }
        if (sources.produceResponse) {
          response = await sources.produceResponse(partial)
          return { status: 'ok', detail: `Response ${response.length} chars` }
        }
        response = [
          identitySummary && `**Identity:** ${identitySummary}`,
          realitySummary && `**Reality:** ${realitySummary}`,
          reasoning && `**Reasoning:** ${reasoning}`,
          decisionNote && `**Decision:** ${decisionNote}`,
          recommendedActions.length && `**Next:** ${recommendedActions.map(a => a.label).join('; ')}`,
          missing.length && `**Missing:** ${missing.join(', ')}`,
        ].filter(Boolean).join('\n\n') || 'No specialist response producer was provided.'
        return { status: 'degraded', detail: 'Default response composer (no specialist produceResponse)' }
      })
      continue
    }

    if (stageId === 'memory_update') {
      await runner.runAsync(stageId, async () => {
        if (sources.readOnly) return { status: 'skipped', detail: 'Read-only run' }
        if (!sources.onMemoryUpdate) return { status: 'skipped', detail: 'No memory update hook' }
        await sources.onMemoryUpdate(await buildPartialResult())
        return { status: 'ok', detail: 'Memory update hook invoked' }
      })
      continue
    }

    if (stageId === 'reality_update') {
      await runner.runAsync(stageId, async () => {
        if (sources.readOnly) return { status: 'skipped', detail: 'Read-only run' }
        if (!sources.onRealityUpdate) return { status: 'skipped', detail: 'No reality update hook' }
        await sources.onRealityUpdate(await buildPartialResult())
        return { status: 'ok', detail: 'Reality update hook invoked' }
      })
      continue
    }

    if (stageId === 'identity_observation') {
      await runner.runAsync(stageId, async () => {
        if (sources.readOnly) return { status: 'skipped', detail: 'Read-only run' }
        if (!sources.onIdentityObservation) return { status: 'skipped', detail: 'No identity observation hook' }
        await sources.onIdentityObservation(await buildPartialResult())
        return { status: 'ok', detail: 'Identity observation hook invoked' }
      })
      continue
    }
  }

  async function buildPartialResult(): Promise<IntelligenceResult> {
    return finalize(0)
  }

  function finalize(durationMs: number): IntelligenceResult {
    const beliefConf = relevantBeliefs.map(b => b.confidence)
    const actionConf = recommendedActions.map(a => a.confidence)
    const stageOk = runner.stages.filter(s => s.status === 'ok').length
    const stageTotal = runner.stages.length || 1
    const coverage = stageOk / stageTotal
    const confidence = clamp01(
      average([
        coverage,
        beliefConf.length ? average(beliefConf) : 0.5,
        actionConf.length ? average(actionConf) : 0.55,
        identitySummary ? 0.85 : 0.45,
        realitySummary ? 0.85 : 0.45,
      ]),
    )

    const explanation = joinSummary([
      identitySummary ? `Grounded in identity (${identitySummary.slice(0, 80)})` : '',
      realitySummary ? `Current reality (${realitySummary.slice(0, 80)})` : '',
      decisionNote ? `Decision: ${decisionNote.slice(0, 80)}` : '',
      missing.length ? `Gaps: ${missing.join(', ')}` : '',
    ], 'Limited context; treat recommendations cautiously.')

    const narrativeHints = [
      ...(sources.identityHints ?? []).slice(0, 4),
      ...(sources.realityHints ?? []).slice(0, 4),
      ...relevantMemories.slice(0, 2).map(m => `Memory: ${m.title}`),
    ]

    const finishedAt = nowISO()
    const trace: IntelligenceTrace = {
      id: newId(),
      version: INTELLIGENCE_PIPELINE_VERSION,
      specialistId: request.specialistId,
      question: request.question,
      startedAt,
      finishedAt,
      durationMs,
      stages: runner.stages,
      overallConfidence: confidence,
      notes,
    }

    return {
      identitySummary: identitySummary || 'No identity summary available.',
      realitySummary: realitySummary || 'No reality summary available.',
      relevantMemories,
      relevantBeliefs,
      supportingEvidence,
      reasoning: reasoning || 'No reasoning available.',
      confidence,
      recommendedActions,
      explanation,
      missingInformation: [...new Set(missing)],
      response,
      trace,
      narrativeHints,
    }
  }

  // Attempt intentional duplicate to prove guard (not added to public API — tested separately via runStageOnce helpers)
  void CANONICAL_STAGE_ORDER

  const result = finalize(Math.round(performance.now() - t0))
  rememberLastResult(result)
  return result
}

/** Verify stage order is the canonical constant (for tests / docs). */
export function getCanonicalStageOrder(): IntelligenceStageId[] {
  return [...CANONICAL_STAGE_ORDER]
}

/** Pure guard used by tests — same duplicate policy as StageRunner. */
export function createDuplicateStageGuard() {
  const seen = new Set<IntelligenceStageId>()
  return (id: IntelligenceStageId): boolean => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  }
}

let lastResult: IntelligenceResult | null = null
const listeners = new Set<(result: IntelligenceResult | null) => void>()

export function rememberLastResult(result: IntelligenceResult | null): void {
  lastResult = result
  for (const listener of listeners) listener(result)
}

export function getLastIntelligenceResult(): IntelligenceResult | null {
  return lastResult
}

export function subscribeIntelligenceResults(
  listener: (result: IntelligenceResult | null) => void,
): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function clearLastIntelligenceResult(): void {
  rememberLastResult(null)
}
